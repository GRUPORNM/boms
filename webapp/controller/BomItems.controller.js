sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel"
],
    function (BaseController, JSONModel) {
        "use strict";

        return BaseController.extend("bomoverview.controller.BomItems", {
            onInit: function () {
                var oViewModel = new JSONModel({
                    busy: true,
                    delay: 0
                });

                this.setModel(oViewModel, "bomItemsView");
                sap.ui.core.UIComponent.getRouterFor(this).getRoute("bomItems").attachPatternMatched(this.onPatternMatched, this);
                this.getRouter().attachRouteMatched(this.getUserAuthentication, this);
            },

            onAfterRendering: function () {
                var that = this;
                sessionStorage.setItem("goToLaunchpad", "");
                window.addEventListener("message", function (event) {
                    var data = event.data;
                    if (data.action == "goToMainPage") {
                        that.onNavBack();
                    }
                });
            },

            onPatternMatched: function (oEvent) {
                this.onBindViewDetail("/" + oEvent.getParameter("config").pattern.replace("/{objectId}", "") + oEvent.getParameter("arguments").objectId, true, oEvent.getParameter("arguments").objectId);
            },

            onBindViewDetail: function (sObjectPath, bForceRefresh, sStlnr) {
                var that = this;
                that.onGetItems(sStlnr);

                this.getView().bindElement({
                    path: sObjectPath,
                    change: this.onBindingChange.bind(this),
                    events: {
                        dataRequested: function () {
                            this.getModel("appView").setProperty("/busy", true);
                        }.bind(this),
                        dataReceived: function () {
                            this.getModel("appView").setProperty("/busy", false);
                        }.bind(this)
                    }
                });

                if (bForceRefresh) {
                    this.getView().getModel().refresh();
                }
            },

            onGetItems: function (sStlnr) {
                var oModel = this.getModel(),
                    that = this;

                if (sStlnr) {
                    var stlnrMatch = sStlnr.match(/stlnr='(\d+)'/),
                        stlalMatch = sStlnr.match(/stlal='(\d+)'/);

                    if (stlnrMatch && stlalMatch) {
                        var sStlnrValue = stlnrMatch[1],
                            sStlalValue = stlalMatch[1];

                        var aFilters = [
                            new sap.ui.model.Filter("stlnr", sap.ui.model.FilterOperator.EQ, sStlnrValue),
                            new sap.ui.model.Filter("stlal", sap.ui.model.FilterOperator.EQ, sStlalValue)
                        ];

                        oModel.read("/xTQAxBOM_ITEMS_DD", {
                            filters: aFilters,
                            success: function (oData) {
                                that.getModel("bomItemsView").setData(oData);
                            },
                            error: function (oError) {
                                var sError = JSON.parse(oError.responseText).error.message.value;

                                sap.m.MessageBox.alert(sError, {
                                    icon: "ERROR",
                                    onClose: null,
                                    styleClass: '',
                                    initialFocus: null,
                                    textDirection: sap.ui.core.TextDirection.Inherit
                                });
                            }
                        });
                    }
                }
            },

            onSaveItemsChanges: function () {
                try {
                    var oBom = this.getModel().getObject(this.getView().getBindingContext().getPath()),
                        sPath = "/BomItems(Stlnr='" + oBom.stlnr + "',Stlal='" + oBom.stlal + "')";

                    var that = this,
                        oModel = this.getModel(),
                        oModelBomItems = this.getModel("bomItemsView"),
                        aItems = oModelBomItems.getProperty("/results");

                    if (!aItems || aItems.length === 0) {
                        sap.m.MessageToast.show("Não há itens para salvar.");
                        return;
                    }

                    aItems = aItems.map(this._removeMetadata);
                    var oEntry = {
                        Json: JSON.stringify(aItems)
                    };

                    if (oEntry) {
                        oModel.update(sPath, oEntry, {
                            success: function () {
                                that.showSuccessSave("changeSuccessText", "changeSuccessTitle");
                                that.byId("BomItemsTable").removeSelections();
                                that.byId("BomItemsTable").getBinding("items").refresh();
        
                                that.onManageEnabledButtons();
                            },
                            error: function (oError) {
                                var sError = JSON.parse(oError.responseText).error.message.value;

                                sap.m.MessageBox.alert(sError, {
                                    icon: "ERROR",
                                    onClose: null,
                                    styleClass: '',
                                    initialFocus: null,
                                    textDirection: sap.ui.core.TextDirection.Inherit
                                });
                            }
                        });
                    }
                } catch (error) {
                    var oMessage = {
                        oText: error.message,
                        oTitle: "Erro"
                    };
                    this.showErrorMessage(oMessage);
                }
            },

            _removeMetadata: function (oItem) {
                if (oItem.__metadata) {
                    delete oItem.__metadata;
                }
                return oItem;
            },

            onCreateBomItem: async function () {
                var oModel = this.getModel("bomItemsView"),
                    aData = oModel.getProperty("/results"),
                    sItem = this.byId("Item").getValue(),
                    sMaterial = this.byId("Material").getSelectedKey(),
                    sMaterialDesc = this.byId("Material").getSelectedItem().getText(),
                    sQuantity = this.byId("Quantity").getValue();

                if (!sItem || !sMaterial || !sQuantity) {
                    sap.m.MessageToast.show("Por favor, preencha todos os campos obrigatórios.");
                    return;
                }

                var oNewItem = {
                    stlnr: this.byId("stlnr").getText(),
                    postp: 'M',
                    posnr: sItem,
                    idnrk: sMaterial,
                    maktx: sMaterialDesc,
                    menge: sQuantity
                };

                aData.push(oNewItem);
                oModel.setProperty("/results", aData);

                this.byId("BomItemsTable").getBinding("items").refresh();
                this.byId("btSaveChanges").setProperty("visible", true);

                this._oDialog.close();
            },

            onUpdateBomItem: function () {
                var oTable = this.byId("BomItemsTable"),
                    oModel = this.getModel("bomItemsView"),
                    aItems = oModel.getProperty("/results"),
                    oSelectedItem = oTable.getSelectedItem();

                var iIndex = oTable.indexOfItem(oSelectedItem);
                var sBomNo = this.byId("BomNo").getValue(),
                    sItem = this.byId("Item").getValue(),
                    sMaterial = this.byId("Material").getSelectedKey(),
                    sMaterialDesc = this.byId("Material").getSelectedItem().getText(),
                    sQuantity = this.byId("Quantity").getValue();

                if (!sItem || !sMaterial || !sQuantity) {
                    sap.m.MessageToast.show("Por favor, preencha todos os campos obrigatórios.");
                    return;
                }

                var oUpdatedItem = {
                    stlnr: sBomNo || "",
                    posnr: sItem,
                    idnrk: sMaterial,
                    maktx: sMaterialDesc,
                    menge: sQuantity
                };

                aItems[iIndex] = oUpdatedItem;

                oModel.setProperty("/results", aItems);
                oTable.getBinding("items").refresh();
                this.byId("btSaveChanges").setProperty("visible", true);

                this._oDialog.close();
            },

            onDeleteBomItem: function () {
                var oTable = this.byId("BomItemsTable"),
                    oModel = this.getModel("bomItemsView"),
                    aItems = oModel.getProperty("/results"),
                    oSelectedItem = oTable.getSelectedItem();

                var iIndex = oTable.indexOfItem(oSelectedItem);

                aItems.splice(iIndex, 1);

                oModel.setProperty("/results", aItems);
                oTable.getBinding("items").refresh();
                this.byId("btSaveChanges").setProperty("visible", true);
            },

            handleDeleteBomItem: function () {
                var that = this;

                new sap.m.MessageBox.warning(this.getResourceBundle().getText("deleteBomItem"), {
                    title: this.getResourceBundle().getText("alertMessageTitle"),
                    actions: [sap.m.MessageBox.Action.OK, sap.m.MessageBox.Action.CANCEL],
                    emphasizedAction: sap.m.MessageBox.Action.OK,
                    onClose: function (oAction) {
                        if (oAction === sap.m.MessageBox.Action.OK) {
                            that.onDeleteBomItem();
                        }
                    }
                });
            },

            onEditBomItem: function (oAction) {
                var oView = this.getView();

                if (!this._oDialog) {
                    this._oDialog = sap.ui.xmlfragment(oView.getId(), "bomoverview.view.Edit", this);
                    oView.addDependent(this._oDialog);
                }

                switch (oAction) {
                    case 'C':
                        this.byId("BomNo").setProperty("visible", false);
                        this.byId("Item").setProperty("enabled", true);
                        this._oDialog.open();
                        break;

                    case 'U':
                        var oSelectedItem = this.byId("BomItemsTable").getSelectedItem().getCells();

                        if (oSelectedItem) {
                            this.byId("BomNo").setValue(oSelectedItem[0].getText());
                            this.byId("Item").setValue(oSelectedItem[1].getText());
                            this.byId("Material").setSelectedKey(oSelectedItem[2].getText());
                            this.byId("Quantity").setValue(oSelectedItem[4].getText());
                        }

                        this.byId("Add").setProperty("visible", false);
                        this.byId("Update").setProperty("visible", true);
                        this._oDialog.open();
                        break;
                }
            },

            onSelectionChange: function (oEvent) {
                var oSource = oEvent.getSource(),
                    aSelectedPaths = oSource.getSelectedContextPaths();

                if (aSelectedPaths.length > 0) {
                    this.byId("btEditItems").setProperty("enabled", true);
                    this.byId("btDeleteItems").setProperty("enabled", true);
                } else {
                    this.byId("btEditItems").setProperty("enabled", false);
                    this.byId("btDeleteItems").setProperty("enabled", false);
                }
            },

            onManageEnabledButtons: function () {
                var aButtons = [],
                    oAddBomItem = {
                        id: "btAddItems",
                        enabled: true
                    },
                    oEditBomItem = {
                        id: "btEditItems",
                        enabled: false
                    },
                    oDeleteBomItem = {
                        id: "btDeleteItems",
                        enabled: false
                    };

                this.byId("btSaveChanges").setProperty("visible", false);
                aButtons.push(oAddBomItem, oEditBomItem, oDeleteBomItem);

                this.onManageButtonsEnable(aButtons);
            },

            showSuccessSave: function (oText, oTitle) {
                var that = this;
                new sap.m.MessageBox.success(that.getResourceBundle().getText(oText), {
                    title: that.getResourceBundle().getText(oTitle),
                    actions: [sap.m.MessageBox.Action.OK],
                    emphasizedAction: sap.m.MessageBox.Action.OK,
                });
            },

            onCloseFragment: function () {
                if (!this._oDialog) {
                    this._oDialog = sap.ui.xmlfragment("EditDialog", "shipsmanagement.view.Edit", this);
                    this.getView().addDependent(this._oDialog);
                }

                this._oDialog.close();
            },

            onAfterClose: function () {
                if (this._oDialog) {
                    this._oDialog.destroy();
                    this._oDialog = null;
                }
            },
        });
    });
