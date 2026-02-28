using { sAP_Java_Personal_Accounts_cdsSrv } from '../srv/service.cds';

annotate sAP_Java_Personal_Accounts_cdsSrv.Books with @UI.HeaderInfo: {
  TypeName: 'Book',
  TypeNamePlural: 'Books',
  Title: { Value: title }
};
annotate sAP_Java_Personal_Accounts_cdsSrv.Books with @UI.LineItem: [
  { $Type: 'UI.DataField', Value: title },
  { $Type: 'UI.DataField', Value: isbn },
  { $Type: 'UI.DataField', Value: stock },
  { $Type: 'UI.DataField', Value: author_ID },
  { $Type: 'UI.DataField', Value: genre_ID }
];
annotate sAP_Java_Personal_Accounts_cdsSrv.Books with @UI.SelectionFields: [title, isbn, stock];

annotate sAP_Java_Personal_Accounts_cdsSrv.Authors with @UI.HeaderInfo: {
  TypeName: 'Author',
  TypeNamePlural: 'Authors',
  Title: { Value: name }
};
annotate sAP_Java_Personal_Accounts_cdsSrv.Authors with @UI.LineItem: [
  { $Type: 'UI.DataField', Value: name },
  { $Type: 'UI.DataField', Value: biography }
];

annotate sAP_Java_Personal_Accounts_cdsSrv.Genres with @UI.HeaderInfo: {
  TypeName: 'Genre',
  TypeNamePlural: 'Genres',
  Title: { Value: name }
};
annotate sAP_Java_Personal_Accounts_cdsSrv.Genres with @UI.LineItem: [
  { $Type: 'UI.DataField', Value: name },
  { $Type: 'UI.DataField', Value: description }
];

annotate sAP_Java_Personal_Accounts_cdsSrv.Members with @UI.LineItem: [
  { $Type: 'UI.DataField', Value: fullName },
  { $Type: 'UI.DataField', Value: email }
];

annotate sAP_Java_Personal_Accounts_cdsSrv.Loans with @UI.LineItem: [
  { $Type: 'UI.DataField', Value: book_ID },
  { $Type: 'UI.DataField', Value: member_ID },
  { $Type: 'UI.DataField', Value: loanDate },
  { $Type: 'UI.DataField', Value: dueDate },
  { $Type: 'UI.DataField', Value: returned }
];
