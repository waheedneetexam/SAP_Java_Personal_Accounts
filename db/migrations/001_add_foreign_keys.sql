-- Foreign key constraints for referential integrity.
-- Apply in production databases where tables already exist.

ALTER TABLE SAP_Java_Personal_Accounts_cds_Books
  ADD CONSTRAINT FK_BOOKS_AUTHOR
  FOREIGN KEY (author_ID)
  REFERENCES SAP_Java_Personal_Accounts_cds_Authors(ID);

ALTER TABLE SAP_Java_Personal_Accounts_cds_Books
  ADD CONSTRAINT FK_BOOKS_GENRE
  FOREIGN KEY (genre_ID)
  REFERENCES SAP_Java_Personal_Accounts_cds_Genres(ID);

ALTER TABLE SAP_Java_Personal_Accounts_cds_Loans
  ADD CONSTRAINT FK_LOANS_BOOK
  FOREIGN KEY (book_ID)
  REFERENCES SAP_Java_Personal_Accounts_cds_Books(ID);

ALTER TABLE SAP_Java_Personal_Accounts_cds_Loans
  ADD CONSTRAINT FK_LOANS_MEMBER
  FOREIGN KEY (member_ID)
  REFERENCES SAP_Java_Personal_Accounts_cds_Members(ID);
