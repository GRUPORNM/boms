sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/UIComponent"
], function (Controller, UIComponent) {
    "use strict";

    var TQAModel;

    return Controller.extend("bomoverview.controller.BaseController", {
        getModelTQA: function () {
            return TQAModel;
        },

        setModelTQA: function (token) {
            var userLanguage = sessionStorage.getItem("oLangu");
            if (!userLanguage) {
                userLanguage = "EN";
            }
            var serviceUrlWithLanguage = this.getModel().sServiceUrl + (this.getModel().sServiceUrl.includes("?") ? "&" : "?") + "sap-language=" + userLanguage;

            TQAModel = new sap.ui.model.odata.v2.ODataModel({
                serviceUrl: serviceUrlWithLanguage,
                annotationURI: "/zsrv_iwfnd/Annotations(TechnicalName='%2FTQA%2FOD_BOM_OVERVIEW_ANNO_MDL',Version='0001')/$value/",
                headers: {
                    "authorization": token,
                    "applicationName": "BOM_OVERVIEW"
                }
            });

            var vModel = new sap.ui.model.odata.v2.ODataModel({
                serviceUrl: "/sap/opu/odata/TQA/OD_VARIANTS_MANAGEMENT_SRV",
                headers: {
                    "authorization": token,
                    "applicationName": "BOM_OVERVIEW"
                }
            });
            this.setModel(vModel, "vModel");
            this.setModel(TQAModel);
        },

        getRouter: function () {
            return UIComponent.getRouterFor(this);
        },

        getModel: function (sName) {
            return this.getView().getModel(sName);
        },

        setModel: function (oModel, sName) {
            return this.getView().setModel(oModel, sName);
        },

        getResourceBundle: function () {
            return this.getOwnerComponent().getModel("i18n").getResourceBundle();
        },

        onNavBack: function () {
            sessionStorage.setItem("goToLaunchpad", "X");
            this.byId("BomItemsTable").removeSelections();
            this.onManageEnabledButtons();
            this.onNavigation("", "bomHeader", "");
        },

        onNavigation: function (sPath, oRoute, oEntityName) {
            if (sPath) {
                this.getRouter().navTo(oRoute, {
                    objectId: sPath.replace(oEntityName, "")
                }, true);
            } else {
                this.getRouter().navTo(oRoute, {}, true);
            }
        },

        onObjectMatched: function (oEvent) {
            this.onBindView("/" + oEvent.getParameter("config").pattern.replace("/{objectId}", "") + oEvent.getParameter("arguments").objectId);
        },

        onBindView: function (sObjectPath) {
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
        },

        onUpdate: function (sPath, oEntry, oToken) {
            try {
                if (sPath) {
                    var oModel = this.getModel(),
                        oAppViewModel = this.getModel("appView");

                    oModel.update(sPath, oEntry, {
                        headers: {
                            "authorization": oToken
                        },
                        success: function () {

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

                    oModel.attachRequestSent(function () {
                        oAppViewModel.setProperty("/busy", true);
                    });
                    oModel.attachRequestCompleted(function () {
                        oAppViewModel.setProperty("/busy", false);
                    });
                    oModel.attachRequestFailed(function () {
                        oAppViewModel.setProperty("/busy", false);
                    });
                }
            } catch (error) {
                var oMessage = {
                    oText: error.message,
                    oTitle: this.getResourceBundle().getText("errorMessageBoxTitle")
                }

                this.showErrorMessage(oMessage);
            }
        },

        onBindingChange: function () {
            var oView = this.getView(),
                oElementBinding = oView.getElementBinding();

            if (!oElementBinding.getBoundContext()) {
                this.getRouter().getTargets().display("notFound");

                return;
            }
        },

        onManageButtonsEnable: function (aButtons) {
            if (aButtons.length > 0) {

                aButtons.forEach(oButton => {
                    this.byId(oButton.id).setEnabled(oButton.enabled);
                });
            }
        },

        showErrorMessage: function (oMessage) {
            new sap.m.MessageBox.error(oMessage.oText, {
                title: oMessage.oTitle,
                actions: [sap.m.MessageBox.Action.OK],
                emphasizedAction: sap.m.MessageBox.Action.OK
            });
        },

        onChangeEnableState: function (oComponents) {
            oComponents.forEach(({ id, state }) => {
                sap.ui.getCore().byId(id).setProperty("enabled", state);
            });
        },

        handleActiveBom: function () {
            var that = this,
                oTable = sap.ui.getCore().byId("smartTableBoms"),
                sPath = oTable.getTable().getSelectedItem().getBindingContextPath(),
                oMessage = {
                    oText: "bomQuestionText",
                    oTitle: "bomQuestionTitle"
                };

            if (sPath) {
                new sap.m.MessageBox.warning(this.getResourceBundle().getText(oMessage.oText), {
                    title: this.getResourceBundle().getText(oMessage.oTitle),
                    actions: [sap.m.MessageBox.Action.OK, sap.m.MessageBox.Action.CANCEL],
                    emphasizedAction: sap.m.MessageBox.Action.OK,
                    onClose: function (oAction) {
                        if (oAction === sap.m.MessageBox.Action.OK) {
                            that.onChangeEnableState([{ id: "activeBom", state: false }]);
                            that.onActiveBom(sPath);
                        } else {
                            that.onChangeEnableState([{ id: "activeBom", state: false }]);
                            oTable.removeSelections();
                        }
                    }
                });
            }
        },

        onActiveBom: function (sPath) {
            var that = this,
                oModel = this.getModel(),
                oObject = oModel.getObject(sPath),
                oMessage = {
                    oText: "bomActiveText",
                    oTitle: "bomActiveTitle"
                };

            var oEntry = {
                stlal: oObject.stlal,
                stlst: oObject.stlst
            };

            if (sPath && oEntry) {
                oModel.update(sPath, oEntry, {
                    success: function (oData) {
                        debugger;
                        that.getModel().refresh(true);
                        that.showSuccessMessage(oMessage);
                        that.onChangeEnableState([{ id: "activeBom", state: false }]);
                    },
                    error: function (oError) {
                        that.onChangeEnableState([{ id: "activeBom", state: false }]);
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
        },

        getUserAuthentication: function (type) {
            var that = this,
                urlParams = new URLSearchParams(window.location.search),
                token = urlParams.get('token');

            if (token != null) {
                var headers = new Headers();
                headers.append("X-authorization", token);

                var requestOptions = {
                    method: 'GET',
                    headers: headers,
                    redirect: 'follow'
                };

                fetch("/sap/opu/odata/TQA/AUTHENTICATOR_SRV/USER_AUTHENTICATION", requestOptions)
                    .then(function (response) {
                        if (!response.ok) {
                            throw new Error("Ocorreu um erro ao ler a entidade.");
                        }
                        return response.text();
                    })
                    .then(function (xml) {
                        var parser = new DOMParser(),
                            xmlDoc = parser.parseFromString(xml, "text/xml"),
                            successResponseElement = xmlDoc.getElementsByTagName("d:SuccessResponse")[0],
                            response = successResponseElement.textContent;

                        if (response != 'X') {
                            that.getRouter().navTo("NotFound");
                        }
                        else {
                            that.getModel("appView").setProperty("/token", token);
                        }
                    })
                    .catch(function (error) {
                        console.error(error);
                    });
            } else {
                that.getRouter().navTo("NotFound");
                return;
            }
        },
    });
});