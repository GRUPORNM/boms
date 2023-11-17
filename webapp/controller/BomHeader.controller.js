sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
],
    function (BaseController, JSONModel, MessageBox) {
        "use strict";

        return BaseController.extend("bomoverview.controller.BomHeader", {
            onInit: function () {
                var oViewModel = new JSONModel({
                    busy: false,
                    delay: 0,
                    oStandard: "stlnr,bmeng,maktx",
                    oSmartTableView: "",
                    variantInput: "Standard"
                });

                this.setModel(oViewModel, "Main");

                var fnSetAppNotBusy = function () {
                    oViewModel.setProperty("/busy", false);
                    oViewModel.setProperty("/delay", 0);
                };

                // this.getOwnerComponent().getModel().metadataLoaded().then(fnSetAppNotBusy.bind(this));
                // this.getOwnerComponent().getModel().attachMetadataFailed(fnSetAppNotBusy);
                this.getRouter().attachRouteMatched(this.getUserAuthentication, this);
                document.addEventListener('keydown', this.onShortcuts.bind(this));
            },

            onShortcuts: function (oEvent) {
                if (sessionStorage.getItem("shortcuts") === 'true') {
                    var that = this;
                    if (oEvent.which === 118) {
                        var oTable = sap.ui.getCore().byId("smartTableBoms").getTable();
                        var sElectedItem = oTable.getSelectedItem();

                        if (sElectedItem) {
                            sElectedItem.firePress();
                        }
                        oTable.removeSelections();
                    } else if (oEvent.which === 114) {
                        oEvent.preventDefault();
                        that.onNavBack();
                    }
                }
            },

            onPressBOM: function (oEvent) {
                var oSource = oEvent.getSource(),
                    sPath = oSource.getBindingContext().getPath();

                this.onNavigation(sPath, "bomItems", "/xTQAxBOM_HEADER_DD");
            },

            onAfterRendering: function () {
                //DEPLOY
                if (sessionStorage.getItem("selectedTheme").indexOf("dark") !== -1) {
                    this.byId("variantInput").removeStyleClass("variantMode");
                    this.byId("variantInput").addStyleClass("variantModeBlack");
                }
                else {
                    this.byId("variantInput").removeStyleClass("variantModeBlack");
                    this.byId("variantInput").addStyleClass("variantMode");
                }
            },

            onBeforeRendering: function () {
                this.onStartVariants();
            },

            onStartVariants: function () {
                var that = this;
                var oModel = this.getModel("vModel");
                oModel.read("/xTQAxUSR_VARIANTS_DD", {
                    success: function (oData) {
                        var oResults = oData.results;
                        oResults.forEach(element => {
                            if (element.v_default) {
                                // that.byId("variantInput").setValue(element.v_name);
                                that.getModel("Main").setProperty("/variantInput", element.v_name)

                                that.getModel("Main").setProperty("/selectedVariant", element.variant_id);
                                if (element.variant_id != "Main") {
                                    var visibleInFilterBar = JSON.parse(atob(element.fbar_settings));
                                    that.onUpdateFilterBar(visibleInFilterBar);
                                    // that.byId("smartTableBoms").setInitiallyVisibleFields(that.getModel("Main").getProperty("/oStandard"));
                                    var allFieldsInVariant = JSON.parse(atob(element.stable_settings));
                                    var allNames = allFieldsInVariant.map(function (obj) {
                                        return obj.name;
                                    }).join(',');

                                    // Remove a última vírgula, se necessário
                                    if (allNames.endsWith(',')) {
                                        allNames = allNames.substring(0, allNames.length - 1);
                                    }
                                    that.getModel("Main").setProperty("/oSmartTableView", allNames);
                                    that.onBuildSmartTable();
                                }
                                else {
                                    that.getModel("Main").setProperty("/oSmartTableView", that.getModel("Main").getProperty("/oStandard"));
                                    that.onBuildSmartTable();
                                }
                            }
                        });
                    },
                    error: function (oError) {
                        // Erro durante a operação
                    }
                });
            },

            onBuildSmartTable: function () {

                var oOldSmartTable = sap.ui.getCore().byId("smartTableBoms");
                if (oOldSmartTable) {
                    oOldSmartTable.destroy();
                }

                // Verificar se a SmartTable foi destruída corretamente
                var oDestroyedSmartTable = sap.ui.getCore().byId("smartTableBoms");
                if (!oDestroyedSmartTable) {
                    // Supondo que "this.getView()" retorne a view onde você quer adicionar a SmartTable
                    var oView = this.getView();
                    // Restante do seu código para criar uma nova SmartTable

                    // Supondo que "this.getView()" retorne a view onde você quer adicionar a SmartTable
                    var oView = this.getView();

                    // Acessar o modelo que contém o array de campos visíveis iniciais
                    var oModel = this.getModel("Main");

                    // Criar a nova SmartTable
                    var oSmartTable = new sap.ui.comp.smarttable.SmartTable({
                        id: "smartTableBoms",
                        entitySet: "xTQAxBOM_HEADER_DD",
                        smartFilterId: "smartFilterBarGroups",
                        tableType: "ResponsiveTable",
                        header: "{i18n>BOMS}",
                        showRowCount: true,
                        enableAutoBinding: true,
                        initialise: function () {
                            this.onSTinitialise.bind(this);
                            var oTable = oSmartTable.getTable();
                            oTable.setMode("SingleSelectLeft");

                            // Anexar evento selectionChange

                            // selectionChange="onChangeSelectionEquip"
                            oTable.attachUpdateFinished(function () {
                                // Aqui a tabela foi atualizada, então você pode acessar os itens
                                var oItems = oTable.getItems();

                                if (oItems.length > 0) {

                                    oItems.forEach(oItem => {
                                        // Verifique se é um ColumnListItem (ou um objeto similar)
                                        if (oItem instanceof sap.m.ColumnListItem) {
                                            // Definir o type e o evento press
                                            oItem.setType("Navigation");
                                            oItem.attachPress(this.onPressBOM.bind(this));
                                        }
                                    });
                                }
                            }.bind(this));

                        }.bind(this),
                        beforeRebindTable: this.onBeforeRebindTable.bind(this),
                        initiallyVisibleFields: oModel.getProperty("/oSmartTableView")
                    }).addStyleClass("sapUiSmallMarginTop");

                    // Adicionar a SmartTable ao seu layout, View, etc.
                    // Supondo que oAggregation é o lugar onde você quer adicionar sua SmartTable
                    var oAggregation = oView.byId("page");
                    oAggregation.setContent(oSmartTable);

                    // Agora, se você quiser adicionar uma Toolbar personalizada, você pode fazer isso também.
                    var oToolbar = new sap.m.OverflowToolbar({
                        // Sua configuração de toolbar aqui
                    });
                    oSmartTable.setCustomToolbar(oToolbar);
                }
            },

            onRouteMatched: function () {

                this.getUserAuthentication();
            },

            onFBarInitialise: function (oEvent) {
                //GUARDAR A VARIANT STANDARD
                var filterGroupItems = this.byId("smartFilterBarGroups").getFilterGroupItems();
                var activeFiltersArray = [];

                filterGroupItems.forEach(function (item) {
                    if (item.mProperties.visibleInFilterBar) {
                        var filterInfo = {
                            name: item.mProperties.name,
                            visibleInFilterBar: item.mProperties.visibleInFilterBar
                        };
                        activeFiltersArray.push(filterInfo);
                    }
                });
                this.getModel("Main").setProperty("/vStandard", activeFiltersArray);
            },

            onSTinitialise: function (oEvent) {
                var that = this;
                var oSmartTable = oEvent.getSource();
                var oInnerTable = oSmartTable.getTable();
                var aColumnData = [];

                var aColumns = oInnerTable.getColumns();

                aColumns.forEach(function (oColumn) {
                    var lastIndex = oColumn.sId.lastIndexOf('-');

                    if (lastIndex !== -1) {
                        var oName = oColumn.sId.substring(lastIndex + 1);
                    }
                    aColumnData.push({
                        name: oName
                    });
                });


                that.getModel("Main").setProperty("/vSmartTableStandard", aColumnData);
            },


            onBeforeRebindTable: function (oEvent) {
                var that = this;
                var oSmartTable = oEvent.getSource();
                var oInnerTable = oSmartTable.getTable();
                var aNewColumnData = [];
                var aColumns = oInnerTable.getColumns();

                aColumns.forEach(function (oColumn) {
                    var lastIndex = oColumn.sId.lastIndexOf('-');

                    if (lastIndex !== -1) {
                        var oName = oColumn.sId.substring(lastIndex + 1);
                    }
                    if (oColumn.getVisible())
                        aNewColumnData.push({
                            name: oName
                        });
                });

                var isDifferent = this.checkArrayDifference(this.getModel("Main").getProperty("/oSmartTableView"), aNewColumnData);
                if (isDifferent) {
                    var oInput = this.byId("variantInput");
                    // oInput.setValue("* " + oInput.getValue().replace(/\*/g, '').trim().replace(/\s+/g, ' ')
                    //     + " *");
                    // Agora activeFiltersArray contém as informações desejadas
                    var activeFiltersJSON = JSON.stringify(aNewColumnData);
                    var activeFiltersBtoa = btoa(activeFiltersJSON);
                    this.getModel("Main").setProperty("/SmartTableBtoa", activeFiltersBtoa);
                }
            },

            checkArrayDifference: function (a, b) {
                // Primeiro, verifique se ambos os arrays têm o mesmo comprimento
                if (a.length !== b.length) {
                    return false;
                }

                // Em seguida, ordene ambos os arrays (isso é necessário apenas se a ordem dos elementos não importa)
                var sortedA = a.slice().sort();
                var sortedB = b.slice().sort();

                // Agora, compare cada elemento
                for (var i = 0; i < sortedA.length; i++) {
                    if (sortedA[i] !== sortedB[i]) {
                        return false;
                    }
                }

                return true;
            },

            // var filterGroupItems = this.byId("smartFilterBarGroups").getFilterGroupItems();

            // filterGroupItems.forEach(oItem => {
            //     oItem.setVisibleInFilterBar(false);
            // });

            // filterGroupItems.forEach(filterItem => {
            //     // filterItem.mProperties.visibleInFilterBar
            //     var itemFinded = fbSettings.some((item) => {
            //         return item.name === filterItem.mProperties.name;
            //     });
            //     if (itemFinded) {
            //         filterItem.setVisibleInFilterBar(true);
            //     };
            // });

            // var oFilter = this.byId("smartFilterBarGroups");
            // debugger;


            onUpdateFilterBar: function (fbSettings) {

                var filterGroupItems = this.byId("smartFilterBarGroups").getFilterGroupItems();


                this.byId("smartFilterBarGroups").clear();

                // Primeiro, definir todos os itens como invisíveis na barra de filtros
                filterGroupItems.forEach(oItem => {
                    oItem.setVisibleInFilterBar(false);
                });

                // Em seguida, faça um loop pelos itens de fbSettings para definir os visíveis e aplicar os valores
                fbSettings.forEach(function (savedFilter) {
                    filterGroupItems.forEach(function (filterItem) {
                        if (savedFilter.name === filterItem.getName()) {
                            filterItem.setVisibleInFilterBar(true); // Definir visível se for encontrado em fbSettings

                            var control = filterItem.getControl();
                            var aFilters = savedFilter.aFilters; // assumindo que isso existe no seu savedFilter

                            if (aFilters && aFilters.length > 0) {
                                var filter = aFilters[0]; // assumindo que você está lidando com apenas um filtro por item
                                if (control instanceof sap.m.Input || control instanceof sap.m.MultiInput) {
                                    control.setValue("*" + filter.oValue1 + "*");
                                }
                                else if (control instanceof sap.m.Select || control instanceof sap.m.ComboBox) {
                                    control.setSelectedKey(filter.oValue1);
                                }
                                else if (control instanceof sap.m.CheckBox) {
                                    control.setSelected(filter.oValue1 === "true" || filter.oValue1 === true);
                                }
                                // Adicione mais casos se você tiver diferentes tipos de controles
                            }
                        }
                    });
                });
            },

            onShowVariantList: function (oEvent) {
                var that = this;
                var oModel = this.getModel("vModel");

                // Verifique se o popover já existe
                if (!this._oPopover) {
                    var oList = new sap.m.List();

                    oList.setModel(oModel);

                    // Faz o bind dos items à lista
                    oList.bindItems({
                        path: "/xTQAxUSR_VARIANTS_DD",
                        template: new sap.m.StandardListItem({
                            title: "{v_name}"
                        })
                    });

                    oList.setMode(sap.m.ListMode.SingleSelectMaster);

                    oList.attachUpdateFinished(function () {
                        this.getItems().forEach(function (item) {
                            item.removeStyleClass("sapMSelectListItemBaseSelected");
                        });
                        this.getItems().forEach(function (item) {

                            var oBindingContext = item.getBindingContext();
                            var variant_id = oBindingContext.getProperty("variant_id");
                            var selectedV = that.getModel("Main").getProperty("/selectedVariant");
                            if (!selectedV) {
                                if (variant_id === "Main") {
                                    item.addStyleClass("sapMSelectListItemBaseSelected");
                                }
                            }
                            else {
                                if (variant_id === selectedV) {
                                    item.addStyleClass("sapMSelectListItemBaseSelected");
                                    that.byId("variantInput").setValue(oBindingContext.getProperty("v_name"));
                                }
                            }
                        });
                    });

                    oList.attachSelectionChange(function (oEvent) {
                        // Primeiro, remova o estilo de seleção de todos os itens
                        this.getItems().forEach(function (item) {
                            item.removeStyleClass("sapMSelectListItemBaseSelected");
                        });

                        // Agora, adicione o estilo ao item que foi realmente selecionado
                        var oListItem = oEvent.getParameter("listItem");
                        oListItem.addStyleClass("sapMSelectListItemBaseSelected");

                        // Atualize o valor de 'selectedVariant' em seu modelo
                        var oBindingContext = oListItem.getBindingContext();
                        var selectedVariant = oBindingContext.getProperty("variant_id");
                        that.getModel("Main").setProperty("/selectedVariant", selectedVariant);
                        // Se você também quiser atualizar algum input com o nome da variante
                        that.byId("variantInput").setValue(oBindingContext.getProperty("v_name"));

                        if (selectedVariant != "Main") {
                            var oObject = that.getModel("vModel").getObject(oBindingContext.sPath);
                            var filterBarAtob = atob(oObject.fbar_settings);
                            var filterBarArray = JSON.parse(filterBarAtob);
                            that.onUpdateFilterBar(filterBarArray);

                            var allFieldsInVariant = JSON.parse(atob(oObject.stable_settings));
                            var allNames = allFieldsInVariant.map(function (obj) {
                                return obj.name;
                            }).join(',');

                            // Remove a última vírgula, se necessário
                            if (allNames.endsWith(',')) {
                                allNames = allNames.substring(0, allNames.length - 1);
                            }

                            that.getModel("Main").setProperty("/oSmartTableView", allNames);
                            that.onBuildSmartTable();
                        }
                        else {
                            that.onUpdateFilterBar(that.getModel("Main").getProperty("/vStandard"));
                            that.getModel("Main").setProperty("/oSmartTableView", that.getModel("Main").getProperty("/oStandard"));
                            that.onBuildSmartTable();
                        }
                        that._oPopover.close();
                    });


                    this._oPopover = new sap.m.ResponsivePopover({
                        contentWidth: "25%",
                        title: this.getView().getModel("i18n").getResourceBundle().getText("MyViews"),
                        placement: "Bottom",
                        beginButton: new sap.m.Button({
                            text: this.getView().getModel("i18n").getResourceBundle().getText("SaveAs"),
                            type: "Emphasized",
                            press: function () {
                                that.onBeforeSaveVariant();
                                this._oPopover.close();
                            }.bind(this)
                        }),
                        endButton: new sap.m.Button({
                            text: this.getView().getModel("i18n").getResourceBundle().getText("Manage"),
                            press: function () {
                                that.onManageViews();
                                this._oPopover.close();
                            }.bind(this)
                        }),
                        content: [oList]
                    });
                }

                this._oPopover.openBy(oEvent.getSource());
            },

            onManageViews: function () {
                if (!this._oManageDialog) {
                    // Criar o diálogo
                    var oModel = this.getModel("vModel");

                    // Search Bar
                    var oSearchBar = new sap.m.SearchField({
                        width: "100%",
                        placeholder: this.getView().getModel("i18n").getResourceBundle().getText("Search"),
                        liveChange: function (oEvent) {

                            var sQuery = oEvent.oSource.getValue();
                            var oFilter = new sap.ui.model.Filter("v_name", sap.ui.model.FilterOperator.Contains, sQuery);
                            oTable.getBinding("items").filter([oFilter]);
                        }
                    });


                    // Tabela
                    var oTable = new sap.m.Table({
                        columns: [
                            new sap.m.Column({ header: new sap.m.Label({ text: this.getView().getModel("i18n").getResourceBundle().getText("VariantName") }) }),
                            new sap.m.Column({ header: new sap.m.Label({ text: this.getView().getModel("i18n").getResourceBundle().getText("Default") }) }),
                            new sap.m.Column({ header: new sap.m.Label({ text: this.getView().getModel("i18n").getResourceBundle().getText("CreatedAt") }) }),
                            new sap.m.Column({ header: new sap.m.Label({ text: "" }) })
                        ]
                    });

                    oTable.setModel(oModel);

                    // Bind items à tabela
                    oTable.bindItems({
                        path: "/xTQAxUSR_VARIANTS_DD",
                        template: new sap.m.ColumnListItem({
                            cells: [
                                new sap.m.Text({ text: "{v_name}" }),
                                new sap.m.CheckBox({
                                    enabled: {
                                        path: 'variant_id',  // Nome da propriedade do modelo
                                        formatter: function (value) {
                                            if (value == "Main")
                                                return false;  // Retornará false se "Main", caso contrário, retornará true
                                        }  // Sua função formatter
                                    },
                                    selected: "{v_default}",
                                    select: function (oEvent) {
                                        var oCheckBox = oEvent.getSource();
                                        var oContext = oCheckBox.getBindingContext();
                                        var selectedState = oCheckBox.getSelected();

                                        var oEntry = {};
                                        oEntry.v_default = selectedState;

                                        oModel.update(oContext.sPath, oEntry, {
                                            success: function (oCreatedData) {
                                                oModel.refresh(true);
                                            },
                                            error: function (oError) {
                                                // Erro durante a operação
                                            }
                                        });
                                    }
                                }),
                                new sap.m.Text({
                                    text: {
                                        path: "created_at",
                                        type: new sap.ui.model.type.Date({
                                            pattern: "dd-MM-yyyy"
                                        })
                                    }
                                }),
                                new sap.m.Button({
                                    icon: "sap-icon://decline",
                                    visible: {
                                        path: 'v_name', // Nome da propriedade do modelo
                                        formatter: function (variantName) {
                                            if (variantName == "Standard") {
                                                return false;
                                            }
                                        }
                                    },
                                    press: function (oEvent) {
                                        var oCheckBox = oEvent.getSource();
                                        var oContext = oCheckBox.getBindingContext();

                                        oModel.remove(oContext.sPath, {
                                            success: function (oCreatedData) {
                                                // Lidar com a remoção bem-sucedida
                                            },
                                            error: function (oError) {
                                                // Lidar com erros durante a operação
                                            }
                                        });
                                    }
                                })
                            ]
                        })
                    });

                    this._oManageDialog = new sap.m.Dialog({
                        title: this.getView().getModel("i18n").getResourceBundle().getText("Manageviews"),
                        content: [oSearchBar, oTable],
                        beginButton: new sap.m.Button({
                            text: this.getView().getModel("i18n").getResourceBundle().getText("Close"),
                            press: function () {
                                this._oManageDialog.close();
                            }.bind(this)
                        })
                    });
                }

                // Abre o diálogo
                this._oManageDialog.open();
            },

            onBeforeSaveVariant: function () {
                // Criar o diálogo
                var that = this;
                var oVariantName = new sap.m.Input({
                    id: "inVariantName"
                });

                var oCheckBox = new sap.m.CheckBox({
                    text: this.getView().getModel("i18n").getResourceBundle().getText("SetDefault")
                });

                var oDialog = new sap.m.Dialog({
                    title: this.getView().getModel("i18n").getResourceBundle().getText("SaveView"),
                    content: [
                        // Criar SimpleForm
                        new sap.ui.layout.form.SimpleForm({
                            editable: true,
                            layout: "ResponsiveGridLayout",
                            content: [
                                // Criar Label
                                new sap.m.Label({
                                    text: this.getView().getModel("i18n").getResourceBundle().getText("View")
                                }),
                                // Criar Input
                                oVariantName,
                                // Criar Checkbox
                                oCheckBox
                            ]
                        })
                    ],
                    buttons: [
                        // Criar botão Save
                        new sap.m.Button({
                            text: this.getView().getModel("i18n").getResourceBundle().getText("Save"),
                            type: "Emphasized",
                            press: function () {
                                that.onSaveVariant(oVariantName.getValue(), oCheckBox.getSelected());
                                oDialog.destroy();
                            }
                        }),
                        // Criar botão Cancel
                        new sap.m.Button({
                            text: this.getView().getModel("i18n").getResourceBundle().getText("Close"),
                            press: function () {
                                oDialog.close();
                                oDialog.destroy();
                            }
                        })
                    ]
                });

                // Exibir o diálogo
                oDialog.open();

            },

            onSaveVariant: function (VariantName, vDefault) {

                var that = this;
                var oModel = this.getModel("vModel");
                var oEntry = {};
                var oFilterBarContext = [];
                debugger;
                //NEW SAVE VARIANT FILTER VALUES
                var oFilterBar = this.byId("smartFilterBarGroups");
                var filterGroupItems = oFilterBar.getFilterGroupItems();
                var activeFiltersArray = [];

                filterGroupItems.forEach(function (item) {
                    if (item.mProperties.visibleInFilterBar) {
                        var filterInfo = {
                            name: item.mProperties.name,
                            visibleInFilterBar: item.mProperties.visibleInFilterBar
                        };
                        activeFiltersArray.push(filterInfo);
                    }
                });

                var activeFiltersJSON = JSON.stringify(activeFiltersArray);
                var activeFiltersBtoa = btoa(activeFiltersJSON);
                this.getModel("Main").setProperty("/fbarBtoa", activeFiltersBtoa);

                var oFilterAvailable = JSON.parse(atob(this.getModel("Main").getProperty("/fbarBtoa")));

                oFilterBar.getFilters().forEach(element => {
                    var aFilters = element.aFilters;

                    // Procura por um objeto correspondente em oFilterAvailable
                    var oMatchingFilter = oFilterAvailable.find(fs => fs.name === aFilters[0]?.sPath);

                    if (oMatchingFilter) {
                        // Atualiza o objeto correspondente com a propriedade aFilters
                        // Se aFilters estiver vazio, define como uma string vazia
                        oMatchingFilter.aFilters = aFilters.length > 0 ? aFilters : " ";

                    }
                });


                oEntry.v_name = VariantName;

                if (this.getModel("Main").getProperty("/fbarBtoa"))
                    oEntry.fbar_settings = btoa(JSON.stringify(oFilterAvailable));
                else
                    oEntry.fbar_settings = btoa(JSON.stringify(this.getModel("Main").getProperty("/vStandard")));
                if (this.getModel("Main").getProperty("/SmartTableBtoa")) {
                    oEntry.stable_settings = this.getModel("Main").getProperty("/SmartTableBtoa");
                }
                else {
                    var oTable = sap.ui.getCore().byId("smartTableBoms").getTable();
                    var aColumnData = [];

                    var aColumns = oTable.getColumns();

                    aColumns.forEach(function (oColumn) {
                        var lastIndex = oColumn.sId.lastIndexOf('-');

                        if (lastIndex !== -1) {
                            var oName = oColumn.sId.substring(lastIndex + 1);
                        }
                        if (oColumn.getVisible())
                            aColumnData.push({
                                name: oName
                            });
                    });

                    oEntry.stable_settings = btoa(JSON.stringify(aColumnData));
                }
                oEntry.app_link = 'BOM_OVERVIEW';
                oEntry.v_default = vDefault;

                // Executa a operação CREATE
                oModel.create("/xTQAxUSR_VARIANTS_DD", oEntry, {
                    success: function (oCreatedData) {
                        that.getModel("Main").setProperty("/selectedVariant", oCreatedData.variant_id);
                    },
                    error: function (oError) {
                        // Erro durante a operação
                    }
                });
            },

            onFilterChange: function (oEvent) {

                //OBTER TODOS OS FILTOS E PREENCHER UM ARRAY COM OS FILTROS VISIVEIS E O NOME
                var filterGroupItems = oEvent.oSource.getFilterGroupItems();
                var activeFiltersArray = [];

                filterGroupItems.forEach(function (item) {
                    if (item.mProperties.visibleInFilterBar) {
                        var filterInfo = {
                            name: item.mProperties.name,
                            visibleInFilterBar: item.mProperties.visibleInFilterBar
                        };
                        activeFiltersArray.push(filterInfo);
                    }
                });

                //ALTERAR O VALUE DO INPUT QUANDO HÁ ALTERAÇÕES
                if (activeFiltersArray.length > 0) {
                    var oInput = this.byId("variantInput");
                    // oInput.setValue("* " + oInput.getValue().replace(/\*/g, '').trim().replace(/\s+/g, ' ')
                    //     + " *");
                }
                // Agora activeFiltersArray contém as informações desejadas
                var activeFiltersJSON = JSON.stringify(activeFiltersArray);
                var activeFiltersBtoa = btoa(activeFiltersJSON);
                this.getModel("Main").setProperty("/fbarBtoa", activeFiltersBtoa);

            },
        });
    });
