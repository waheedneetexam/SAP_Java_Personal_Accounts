package customer.sap_java_personal_accounts.handlers;

import java.time.LocalDate;
import java.util.Map;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import com.sap.cds.ql.Insert;
import com.sap.cds.ql.Select;
import com.sap.cds.ql.Update;
import com.sap.cds.services.ErrorStatuses;
import com.sap.cds.services.ServiceException;
import com.sap.cds.services.handler.EventHandler;
import com.sap.cds.services.handler.annotations.Before;
import com.sap.cds.services.handler.annotations.On;
import com.sap.cds.services.handler.annotations.ServiceName;
import com.sap.cds.services.persistence.PersistenceService;

@Component
@ServiceName("sAP_Java_Personal_Accounts_cdsSrv")
public class LibraryServiceHandler implements EventHandler {

    private static final String BOOKS_ENTITY = "sAP_Java_Personal_Accounts_cdsSrv.Books";
    private static final String MEMBERS_ENTITY = "sAP_Java_Personal_Accounts_cdsSrv.Members";
    private static final String LOANS_ENTITY = "sAP_Java_Personal_Accounts_cdsSrv.Loans";

    private static final int MAX_DESCRIPTION_LENGTH = 500;
    private static final int DEFAULT_LOAN_DAYS = 14;

    @Autowired
    PersistenceService db;

    @Before(event = { "CREATE", "UPDATE" }, entity = BOOKS_ENTITY)
    public void validateBookDescription(Map<String, Object> book) {
        Object description = book.get("description");
        if (description instanceof String desc && desc.length() > MAX_DESCRIPTION_LENGTH) {
            throw new ServiceException(
                ErrorStatuses.BAD_REQUEST,
                "Book description exceeds maximum length of " + MAX_DESCRIPTION_LENGTH + " characters"
            );
        }
    }

    @On(event = "borrowBook")
    public Map<String, Object> borrowBook(Map<String, Object> params) {
        String bookId = toStringValue(params.get("bookId"));
        String memberId = toStringValue(params.get("memberId"));

        if (bookId == null || memberId == null) {
            throw new ServiceException(ErrorStatuses.BAD_REQUEST, "bookId and memberId are required");
        }

        int loanDays = Optional.ofNullable(toIntegerValue(params.get("loanDays"))).orElse(DEFAULT_LOAN_DAYS);
        if (loanDays <= 0) {
            throw new ServiceException(ErrorStatuses.BAD_REQUEST, "loanDays must be greater than zero");
        }

        Map<String, Object> book = db.run(
            Select.from(BOOKS_ENTITY)
                .columns("ID", "title", "stock", "description")
                .where(b -> b.get("ID").eq(bookId))
        ).first(Map.class).orElseThrow(() -> new ServiceException(ErrorStatuses.NOT_FOUND, "Book not found"));

        String description = toStringValue(book.get("description"));
        if (description != null && description.length() > MAX_DESCRIPTION_LENGTH) {
            throw new ServiceException(
                ErrorStatuses.BAD_REQUEST,
                "Cannot borrow this book because description exceeds " + MAX_DESCRIPTION_LENGTH + " characters"
            );
        }

        Integer stock = toIntegerValue(book.get("stock"));
        if (stock == null || stock <= 0) {
            throw new ServiceException(ErrorStatuses.BAD_REQUEST, "Book is out of stock");
        }

        db.run(
            Select.from(MEMBERS_ENTITY)
                .columns("ID")
                .where(m -> m.get("ID").eq(memberId))
        ).first(Map.class).orElseThrow(() -> new ServiceException(ErrorStatuses.NOT_FOUND, "Member not found"));

        db.run(
            Update.entity(BOOKS_ENTITY)
                .data("stock", stock - 1)
                .where(b -> b.get("ID").eq(bookId))
        );

        LocalDate loanDate = LocalDate.now();
        LocalDate dueDate = loanDate.plusDays(loanDays);

        Map<String, Object> loanEntry = Map.of(
            "book_ID", bookId,
            "member_ID", memberId,
            "loanDate", loanDate,
            "dueDate", dueDate,
            "returned", false
        );

        return db.run(Insert.into(LOANS_ENTITY).entry(loanEntry))
            .first(Map.class)
            .orElse(loanEntry);
    }

    private String toStringValue(Object value) {
        return value == null ? null : String.valueOf(value);
    }

    private Integer toIntegerValue(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Integer integerValue) {
            return integerValue;
        }
        if (value instanceof Number numberValue) {
            return numberValue.intValue();
        }
        return Integer.valueOf(String.valueOf(value));
    }
}
