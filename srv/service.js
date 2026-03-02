const cds = global.cds || require("@sap/cds-dk/node_modules/@sap/cds");
const { SELECT, INSERT, UPDATE } = cds.ql;

module.exports = cds.service.impl(function () {
  const { Books, Authors, Genres, Members, Loans } = this.entities;
  const MAX_DESCRIPTION_LENGTH = 500;
  const DEFAULT_LOAN_DAYS = 14;
  const MAX_ACTIVE_LOANS_PER_MEMBER = 2;

  const toIsoDate = (d) => d.toISOString().slice(0, 10);

  const getBook = async (tx, bookId) => {
    return tx.run(
      SELECT.one.from(Books).columns("ID", "title", "stock").where({ ID: bookId })
    );
  };

  const getMember = async (tx, memberId) => {
    return tx.run(
      SELECT.one.from(Members).columns("ID", "fullName").where({ ID: memberId })
    );
  };

  const enforceBorrowRules = async (tx, memberId, bookId) => {
    const activeLoans = await tx.run(
      SELECT.from(Loans).columns("ID", "book_ID").where({ member_ID: memberId, returned: false })
    );

    if (activeLoans.length >= MAX_ACTIVE_LOANS_PER_MEMBER) {
      throw reqError(400, `Member cannot borrow more than ${MAX_ACTIVE_LOANS_PER_MEMBER} active books`);
    }

    if (activeLoans.some((loan) => loan.book_ID === bookId)) {
      throw reqError(400, "Member already has an active loan for this book");
    }
  };

  const reqError = (code, message) => {
    const err = new Error(message);
    err.status = code;
    err.code = String(code);
    return err;
  };

  this.before(["CREATE", "UPDATE"], Books, async (req) => {
    const tx = cds.transaction(req);
    const desc = req.data.description;

    if (typeof desc === "string" && desc.length > MAX_DESCRIPTION_LENGTH) {
      req.reject(400, `Book description exceeds maximum length of ${MAX_DESCRIPTION_LENGTH} characters`);
    }

    if (req.data.stock != null && Number(req.data.stock) < 0) {
      req.reject(400, "Book stock cannot be negative");
    }

    if (req.data.author_ID) {
      const author = await tx.run(SELECT.one.from(Authors).columns("ID").where({ ID: req.data.author_ID }));
      if (!author) {
        req.reject(400, "Selected Author does not exist");
      }
    }

    if (req.data.genre_ID) {
      const genre = await tx.run(SELECT.one.from(Genres).columns("ID").where({ ID: req.data.genre_ID }));
      if (!genre) {
        req.reject(400, "Selected Genre does not exist");
      }
    }
  });

  this.on("borrowBook", async (req) => {
    const tx = cds.transaction(req);
    const { bookId, memberId } = req.data || {};
    const loanDays = Number(req.data?.loanDays || DEFAULT_LOAN_DAYS);

    if (!bookId || !memberId) {
      req.reject(400, "bookId and memberId are required");
    }
    if (!Number.isFinite(loanDays) || loanDays <= 0) {
      req.reject(400, "loanDays must be greater than zero");
    }

    const book = await getBook(tx, bookId);
    if (!book) {
      req.reject(404, "Book not found");
    }
    if (!book.stock || book.stock <= 0) {
      req.reject(400, "Book is out of stock");
    }

    const member = await getMember(tx, memberId);
    if (!member) {
      req.reject(404, "Member not found");
    }

    try {
      await enforceBorrowRules(tx, memberId, bookId);
    } catch (e) {
      req.reject(e.status || 400, e.message || "Borrow validation failed");
    }

    await tx.run(UPDATE(Books).set({ stock: book.stock - 1 }).where({ ID: bookId }));

    const today = new Date();
    const dueDate = new Date(today.getTime() + loanDays * 24 * 60 * 60 * 1000);
    const payload = {
      ID: cds.utils.uuid(),
      book_ID: bookId,
      member_ID: memberId,
      loanDate: toIsoDate(today),
      dueDate: toIsoDate(dueDate),
      returned: false
    };

    await tx.run(INSERT.into(Loans).entries(payload));
    return payload;
  });

  this.on("returnBook", async (req) => {
    const tx = cds.transaction(req);
    const { loanId } = req.data || {};

    if (!loanId) {
      req.reject(400, "loanId is required");
    }

    const loan = await tx.run(
      SELECT.one.from(Loans).columns("ID", "book_ID", "returned").where({ ID: loanId })
    );

    if (!loan) {
      req.reject(404, "Loan not found");
    }
    if (loan.returned) {
      req.reject(400, "Loan is already returned");
    }

    const book = await getBook(tx, loan.book_ID);
    if (!book) {
      req.reject(400, "Cannot return loan because linked Book does not exist");
    }

    await tx.run(UPDATE(Loans).set({ returned: true }).where({ ID: loanId }));
    await tx.run(UPDATE(Books).set({ stock: Number(book.stock || 0) + 1 }).where({ ID: loan.book_ID }));

    return tx.run(SELECT.one.from(Loans).where({ ID: loanId }));
  });
});
