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
                this.getOwnerComponent().getRouter().attachRouteMatched(this.onObjectMatched, this);
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
        });
    });
