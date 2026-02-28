const cds = global.cds || require("@sap/cds-dk/node_modules/@sap/cds");
const { SELECT, INSERT, UPDATE } = cds.ql;

module.exports = cds.service.impl(function () {
  const { Books, Members, Loans } = this.entities;
  const MAX_DESCRIPTION_LENGTH = 500;
  const DEFAULT_LOAN_DAYS = 14;

  this.before(["CREATE", "UPDATE"], Books, (req) => {
    const desc = req.data.description;
    if (typeof desc === "string" && desc.length > MAX_DESCRIPTION_LENGTH) {
      req.reject(400, `Book description exceeds maximum length of ${MAX_DESCRIPTION_LENGTH} characters`);
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

    const book = await tx.run(
      SELECT.one.from(Books).columns("ID", "description", "stock").where({
        ID: bookId
      })
    );
    if (!book) {
      req.reject(404, "Book not found");
    }

    if (book.description && book.description.length > MAX_DESCRIPTION_LENGTH) {
      req.reject(400, `Cannot borrow this book because description exceeds ${MAX_DESCRIPTION_LENGTH} characters`);
    }
    if (!book.stock || book.stock <= 0) {
      req.reject(400, "Book is out of stock");
    }

    const member = await tx.run(
      SELECT.one.from(Members).columns("ID").where({
        ID: memberId
      })
    );
    if (!member) {
      req.reject(404, "Member not found");
    }

    await tx.run(
      UPDATE(Books).set({ stock: book.stock - 1 }).where({
        ID: bookId
      })
    );

    const today = new Date();
    const dueDate = new Date(today.getTime() + loanDays * 24 * 60 * 60 * 1000);
    const payload = {
      book_ID: bookId,
      member_ID: memberId,
      loanDate: today.toISOString().slice(0, 10),
      dueDate: dueDate.toISOString().slice(0, 10),
      returned: false
    };

    payload.ID = cds.utils.uuid();
    await tx.run(INSERT.into(Loans).entries(payload));
    return payload;
  });
});
