namespace SAP_Java_Personal_Accounts_cds;
using { cuid, managed } from '@sap/cds/common';

entity Authors : cuid {
  name        : String(120) @mandatory;
  biography   : String(1000);
  books       : Association to many Books on books.author = $self;
}

@assert.unique: { genreName: [name] }
entity Genres : cuid {
  name        : String(80) @mandatory;
  description : String(255);
  books       : Association to many Books on books.genre = $self;
}

@assert.unique: { isbnUnique: [isbn] }
@assert.integrity
entity Books : cuid {
  title       : String(200) @mandatory;
  isbn        : String(20) @mandatory;
  description : String(500);
  stock       : Integer default 0;
  author      : Association to Authors @mandatory;
  genre       : Association to Genres @mandatory;
  loans       : Association to many Loans on loans.book = $self;
}

entity Members : cuid {
  fullName : String(120) @mandatory;
  email    : String(120) @mandatory;
  loans    : Association to many Loans on loans.member = $self;
}

@assert.integrity
entity Loans : cuid, managed {
  book      : Association to Books @mandatory;
  member    : Association to Members @mandatory;
  loanDate  : Date @mandatory;
  dueDate   : Date @mandatory;
  returned  : Boolean default false;
}
