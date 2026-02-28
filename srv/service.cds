using { SAP_Java_Personal_Accounts_cds as my } from '../db/schema.cds';

@path: '/service/sAP_Java_Personal_Accounts_cds'
@requires: 'authenticated-user'
service sAP_Java_Personal_Accounts_cdsSrv {
  @requires: 'admin'
  @odata.draft.enabled
  entity Books as projection on my.Books;

  @requires: 'admin'
  @odata.draft.enabled
  entity Authors as projection on my.Authors;

  @requires: 'admin'
  @odata.draft.enabled
  entity Genres as projection on my.Genres;

  @odata.draft.enabled
  entity Members as projection on my.Members;

  entity Loans as projection on my.Loans;

  @requires: 'authenticated-user'
  action borrowBook(bookId : UUID, memberId : UUID, loanDays : Integer) returns Loans;
}
