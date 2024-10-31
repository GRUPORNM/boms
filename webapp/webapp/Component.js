sap.ui.define([
    "sap/ui/core/UIComponent",
    "bomoverview/model/models",
    "./controller/ErrorHandler"
],
    function (UIComponent, models, ErrorHandler) {
        "use strict";

        return UIComponent.extend("bomoverview.Component", {
            metadata: {
                manifest: "json"
            },

            init: function () {
                UIComponent.prototype.init.apply(this, arguments);

                this._oErrorHandler = new ErrorHandler(this);

                this.getRouter().initialize();
                this.setModel(models.createDeviceModel(), "device");
                this.setModel(models.createGlobalModel(), "global");

                // document.addEventListener('keydown', this.handleF5Pressed.bind(this));
            },

            destroy: function () {
                this._oErrorHandler.destroy();

                UIComponent.prototype.destroy.apply(this, arguments);
            },

            // handleF5Pressed: function (event) {
            //     if (event.which === 116 || (event.ctrlKey && event.which === 82)) {
            //         event.preventDefault();
            //         window.parent.postMessage("reloadIframe", "*");
            //     }
            // }
        });
    }
);