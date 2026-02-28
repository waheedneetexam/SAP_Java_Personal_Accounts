sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageBox",
  "sap/m/MessageToast",
  "sap/m/Dialog",
  "sap/m/Button",
  "sap/m/Label",
  "sap/m/Input",
  "sap/m/TextArea",
  "sap/m/VBox"
], function (
  Controller,
  JSONModel,
  MessageBox,
  MessageToast,
  Dialog,
  Button,
  Label,
  Input,
  TextArea,
  VBox
) {
  "use strict";

  return Controller.extend("library.controller.Main", {
    onInit: function () {
      this._csrfToken = null;
      this._authHeader = null;
      var oModel = new JSONModel({
        books: [],
        authors: [],
        genres: [],
        members: [],
        loans: [],
        auth: {
          username: "",
          password: ""
        },
        borrow: {
          bookId: "",
          memberId: "",
          loanDays: 14
        }
      });
      this.getView().setModel(oModel, "view");
      this._openLoginDialog();
    },

    onRefreshAll: async function () {
      if (!this._authHeader) {
        this._openLoginDialog();
        return;
      }
      try {
        var aResults = await Promise.all([
          this._fetchCollection("Books?$orderby=title"),
          this._fetchCollection("Authors?$orderby=name"),
          this._fetchCollection("Genres?$orderby=name"),
          this._fetchCollection("Members?$orderby=fullName"),
          this._fetchCollection("Loans?$orderby=createdAt desc")
        ]);

        var oModel = this.getView().getModel("view");
        oModel.setProperty("/books", aResults[0]);
        oModel.setProperty("/authors", aResults[1]);
        oModel.setProperty("/genres", aResults[2]);
        oModel.setProperty("/members", aResults[3]);
        oModel.setProperty("/loans", aResults[4]);
      } catch (e) {
        MessageBox.error(e.message || "Failed to refresh data");
      }
    },

    onChangeLogin: function () {
      this._openLoginDialog();
    },

    onCreateBook: function () {
      this._openBookDialog("Create Book", {}, async function (oPayload) {
        await this._request("Books", {
          method: "POST",
          body: JSON.stringify(oPayload)
        });
        MessageToast.show("Book created");
        this.onRefreshAll();
      }.bind(this));
    },

    onEditBook: function () {
      var oRow = this._getSelectedRow("booksTable");
      if (!oRow) {
        MessageBox.warning("Select a book first");
        return;
      }

      this._openBookDialog("Edit Book", oRow, async function (oPayload) {
        await this._request(this._entityKeyPath("Books", oRow), {
          method: "PATCH",
          body: JSON.stringify(oPayload)
        });
        MessageToast.show("Book updated");
        this.onRefreshAll();
      }.bind(this));
    },

    onDeleteBook: function () {
      this._deleteSelected("booksTable", "Books", "book");
    },

    onCreateAuthor: function () {
      this._openSimpleDialog("Create Author", [
        { key: "name", label: "Name", control: "input", required: true },
        { key: "biography", label: "Biography", control: "textarea" }
      ], {}, async function (oPayload) {
        await this._request("Authors", { method: "POST", body: JSON.stringify(oPayload) });
        MessageToast.show("Author created");
        this.onRefreshAll();
      }.bind(this));
    },

    onEditAuthor: function () {
      var oRow = this._getSelectedRow("authorsTable");
      if (!oRow) {
        MessageBox.warning("Select an author first");
        return;
      }
      this._openSimpleDialog("Edit Author", [
        { key: "name", label: "Name", control: "input", required: true },
        { key: "biography", label: "Biography", control: "textarea" }
      ], oRow, async function (oPayload) {
        await this._request(this._entityKeyPath("Authors", oRow), { method: "PATCH", body: JSON.stringify(oPayload) });
        MessageToast.show("Author updated");
        this.onRefreshAll();
      }.bind(this));
    },

    onDeleteAuthor: function () {
      this._deleteSelected("authorsTable", "Authors", "author");
    },

    onCreateGenre: function () {
      this._openSimpleDialog("Create Genre", [
        { key: "name", label: "Name", control: "input", required: true },
        { key: "description", label: "Description", control: "textarea" }
      ], {}, async function (oPayload) {
        await this._request("Genres", { method: "POST", body: JSON.stringify(oPayload) });
        MessageToast.show("Genre created");
        this.onRefreshAll();
      }.bind(this));
    },

    onEditGenre: function () {
      var oRow = this._getSelectedRow("genresTable");
      if (!oRow) {
        MessageBox.warning("Select a genre first");
        return;
      }
      this._openSimpleDialog("Edit Genre", [
        { key: "name", label: "Name", control: "input", required: true },
        { key: "description", label: "Description", control: "textarea" }
      ], oRow, async function (oPayload) {
        await this._request(this._entityKeyPath("Genres", oRow), { method: "PATCH", body: JSON.stringify(oPayload) });
        MessageToast.show("Genre updated");
        this.onRefreshAll();
      }.bind(this));
    },

    onDeleteGenre: function () {
      this._deleteSelected("genresTable", "Genres", "genre");
    },

    onBorrowBook: async function () {
      var oBorrow = this.getView().getModel("view").getProperty("/borrow");
      if (!oBorrow.bookId || !oBorrow.memberId) {
        MessageBox.warning("Enter both Book ID and Member ID");
        return;
      }

      try {
        await this._request("borrowBook", {
          method: "POST",
          body: JSON.stringify({
            bookId: oBorrow.bookId,
            memberId: oBorrow.memberId,
            loanDays: Number(oBorrow.loanDays || 14)
          })
        });
        MessageToast.show("Borrow request submitted");
        this.onRefreshAll();
      } catch (e) {
        MessageBox.error(e.message || "Borrow request failed");
      }
    },

    _deleteSelected: function (sTableId, sEntity, sLabel) {
      var oRow = this._getSelectedRow(sTableId);
      if (!oRow) {
        MessageBox.warning("Select a " + sLabel + " first");
        return;
      }

      MessageBox.confirm("Delete selected " + sLabel + "?", {
        onClose: async function (sAction) {
          if (sAction !== MessageBox.Action.OK) {
            return;
          }
          try {
            await this._request(this._entityKeyPath(sEntity, oRow), { method: "DELETE" });
            MessageToast.show("Deleted");
            this.onRefreshAll();
          } catch (e) {
            MessageBox.error(e.message || "Delete failed");
          }
        }.bind(this)
      });
    },

    _openBookDialog: function (sTitle, oInitialData, fnSubmit) {
      this._openSimpleDialog(sTitle, [
        { key: "title", label: "Title", control: "input", required: true },
        { key: "isbn", label: "ISBN", control: "input", required: true },
        { key: "description", label: "Description", control: "textarea" },
        { key: "stock", label: "Stock", control: "input", type: "Number" },
        { key: "author_ID", label: "Author ID", control: "input", required: true },
        { key: "genre_ID", label: "Genre ID", control: "input" }
      ], oInitialData, fnSubmit);
    },

    _openSimpleDialog: function (sTitle, aFields, oInitialData, fnSubmit) {
      var mControls = {};
      var oForm = new VBox({ width: "100%" });

      aFields.forEach(function (oField) {
        oForm.addItem(new Label({ text: oField.label + (oField.required ? " *" : "") }));

        var oControl;
        if (oField.control === "textarea") {
          oControl = new TextArea({
            value: oInitialData[oField.key] || "",
            rows: 3,
            width: "100%"
          });
        } else {
          oControl = new Input({
            value: oInitialData[oField.key] != null ? String(oInitialData[oField.key]) : "",
            type: oField.type || "Text",
            width: "100%"
          });
        }

        mControls[oField.key] = oControl;
        oForm.addItem(oControl);
      });

      var oDialog = new Dialog({
        title: sTitle,
        contentWidth: "34rem",
        content: [oForm],
        beginButton: new Button({
          text: "Save",
          type: "Emphasized",
          press: async function () {
            try {
              var oPayload = {};
              aFields.forEach(function (oField) {
                var sVal = mControls[oField.key].getValue().trim();
                if (oField.required && !sVal) {
                  throw new Error(oField.label + " is required");
                }
                if (oField.type === "Number") {
                  oPayload[oField.key] = sVal === "" ? 0 : Number(sVal);
                } else if (sVal !== "") {
                  oPayload[oField.key] = sVal;
                }
              });

              await fnSubmit(oPayload);
              oDialog.close();
            } catch (e) {
              MessageBox.error(e.message || "Save failed");
            }
          }
        }),
        endButton: new Button({
          text: "Cancel",
          press: function () {
            oDialog.close();
          }
        }),
        afterClose: function () {
          oDialog.destroy();
        }
      });

      oDialog.open();
    },

    _getSelectedRow: function (sTableId) {
      var oTable = this.byId(sTableId);
      var oItem = oTable.getSelectedItem();
      if (!oItem) {
        return null;
      }
      return oItem.getBindingContext("view").getObject();
    },

    _entityKeyPath: function (sEntity, oRow) {
      var bDraft = ["Books", "Authors", "Genres", "Members"].indexOf(sEntity) > -1;
      if (bDraft) {
        return sEntity + "(ID=" + oRow.ID + ",IsActiveEntity=true)";
      }
      return sEntity + "(" + oRow.ID + ")";
    },

    _fetchCollection: async function (sPath) {
      var oResponse = await this._request(sPath, { method: "GET" }, false);
      return oResponse.value || [];
    },

    _request: async function (sPath, mOptions, bCsrfOptional) {
      if (!this._authHeader) {
        throw new Error("Please sign in first");
      }

      var sBase = "/service/sAP_Java_Personal_Accounts_cds/";
      var mRequest = Object.assign({ method: "GET" }, mOptions || {});
      mRequest.headers = Object.assign({
        "Accept": "application/json",
        "Authorization": this._authHeader
      }, mRequest.headers || {});

      var bModifying = ["POST", "PATCH", "PUT", "DELETE"].indexOf(mRequest.method) > -1;
      if (bModifying) {
        if (!this._csrfToken && !bCsrfOptional) {
          await this._loadCsrfToken();
        }
        if (this._csrfToken) {
          mRequest.headers["x-csrf-token"] = this._csrfToken;
        }
        if (mRequest.body) {
          mRequest.headers["Content-Type"] = "application/json";
        }
      }

      var oResponse = await fetch(sBase + sPath, mRequest);
      if (oResponse.status === 401) {
        this._authHeader = null;
        throw new Error("Unauthorized. Please verify username and password.");
      }
      if (!oResponse.ok) {
        var oErrorBody = {};
        try {
          oErrorBody = await oResponse.json();
        } catch (e) {
          oErrorBody = {};
        }
        var sMessage = oErrorBody.error && oErrorBody.error.message
          ? oErrorBody.error.message
          : "Request failed with status " + oResponse.status;
        throw new Error(sMessage);
      }

      if (oResponse.status === 204) {
        return {};
      }
      return oResponse.json();
    },

    _loadCsrfToken: async function () {
      var oResponse = await fetch("/service/sAP_Java_Personal_Accounts_cds/Books", {
        method: "GET",
        headers: {
          "x-csrf-token": "Fetch",
          "Authorization": this._authHeader
        }
      });
      this._csrfToken = oResponse.headers.get("x-csrf-token") || null;
    },

    _openLoginDialog: function () {
      var oAuth = this.getView().getModel("view").getProperty("/auth");
      var oUserInput = new Input({
        value: oAuth.username || "",
        placeholder: "Username",
        width: "100%"
      });
      var oPassInput = new Input({
        value: oAuth.password || "",
        placeholder: "Password",
        type: "Password",
        width: "100%"
      });

      var oDialog = new Dialog({
        title: "Sign In",
        contentWidth: "28rem",
        content: [
          new VBox({
            width: "100%",
            items: [
              new Label({ text: "Username" }),
              oUserInput,
              new Label({ text: "Password", class: "sapUiTinyMarginTop" }),
              oPassInput
            ]
          })
        ],
        beginButton: new Button({
          text: "Login",
          type: "Emphasized",
          press: async function () {
            var sUsername = oUserInput.getValue().trim();
            var sPassword = oPassInput.getValue();
            if (!sUsername || !sPassword) {
              MessageBox.warning("Username and password are required");
              return;
            }

            this.getView().getModel("view").setProperty("/auth", {
              username: sUsername,
              password: sPassword
            });
            this._authHeader = "Basic " + btoa(sUsername + ":" + sPassword);
            this._csrfToken = null;

            try {
              await this._fetchCollection("Books?$top=1");
              oDialog.close();
              MessageToast.show("Login successful");
              this.onRefreshAll();
            } catch (e) {
              this._authHeader = null;
              MessageBox.error(e.message || "Login failed");
            }
          }.bind(this)
        }),
        endButton: new Button({
          text: "Close",
          press: function () {
            oDialog.close();
          }
        }),
        afterClose: function () {
          oDialog.destroy();
        }
      });

      oDialog.open();
    }
  });
});
