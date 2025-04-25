sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/m/MessageToast",
  "sap/m/PDFViewer"
], function (Controller, MessageToast, PDFViewer) {
  "use strict";

  return Controller.extend("project1.controller.View1", {

    dataArray: [],

    onInit: function () {
      // Initialize dataArray
      this.dataArray = [];

      // Set tab model for navigation
      var oModel = new sap.ui.model.json.JSONModel({
        tabs: [
          { title: "Upload Students", icon: "sap-icon://upload" },
          { title: "View Students", icon: "sap-icon://table-chart" }
        ]
      });
      this.getView().setModel(oModel);
    },

    handleUploadPress: function () {
      const uploader = this.getView().byId("fileUploader");
      const fileInput = uploader.getDomRef("fu");

      if (fileInput && fileInput.files.length > 0) {
        const file = fileInput.files[0];
        this._processExcel(file);
      } else {
        MessageToast.show("Please select a file first.");
      }
    },

    _processExcel: function (file) {
      const reader = new FileReader();
      const that = this;

      reader.onload = function (e) {
        const binary = e.target.result;
        const workbook = XLSX.read(binary, { type: "binary" });

        const firstSheet = workbook.SheetNames[0];
        const sheet = workbook.Sheets[firstSheet];
        const jsonData = XLSX.utils.sheet_to_json(sheet);

        that.dataArray = jsonData;

        const oModel = new sap.ui.model.json.JSONModel();
        oModel.setData({ dataArray: that.dataArray });
        that.getView().setModel(oModel);

        const oTable = that.getView().byId("excelTable");
        oTable.setVisible(true);

        that._postExcelData();
      };

      reader.readAsBinaryString(file);
    },

    _postExcelData: function () {
      const that = this;
      const serviceUrl = this.getOwnerComponent().getModel().sServiceUrl;
      const postUrl = `${serviceUrl}/Students`;

      let successCount = 0;
      let errorCount = 0;
      const total = this.dataArray.length;

      this.dataArray.forEach(function (student) {
        $.ajax({
          url: postUrl,
          method: "POST",
          contentType: "application/json",
          data: JSON.stringify(student),
          success: function () {
            successCount++;
            if (successCount + errorCount === total) {
              that._showUploadSummary(successCount, errorCount);
            }
          },
          error: function (xhr, status, error) {
            errorCount++;
            console.error("Upload error:", {
              status: status,
              error: error,
              responseText: xhr.responseText,
              studentData: student
            });

            if (successCount + errorCount === total) {
              that._showUploadSummary(successCount, errorCount);
            }
          }
        });
      });
    },

    _showUploadSummary: function (successCount, errorCount) {
      if (errorCount === 0) {
        MessageToast.show("All records uploaded successfully!");
      } else {
        MessageToast.show(`Upload finished: ${successCount} success, ${errorCount} failed.`);
      }
    },

    loadAllStudents: function () {
      const that = this;
      const serviceUrl = this.getOwnerComponent().getModel().sServiceUrl;
      const getUrl = `${serviceUrl}/Students`;

      $.ajax({
        url: getUrl,
        method: "GET",
        success: function (data) {
          const oModel = new sap.ui.model.json.JSONModel();
          oModel.setData({ dataArray: data.value });
          that.getView().setModel(oModel);

          const oTable = that.getView().byId("excelTable");
          oTable.setVisible(true);
        },
        error: function (xhr) {
          console.error("Failed to fetch student data:", xhr.responseText);
        }
      });
    },

    onExportExcel: function () {
      const oModel = this.getView().getModel();
      const data = oModel.getProperty("/dataArray");

      if (!data || data.length === 0) {
        MessageToast.show("No data to export.");
        return;
      }

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "StudentData");
      XLSX.writeFile(wb, "StudentData.xlsx");
    },

    handleExportPress: function () {
      if (!this.dataArray || this.dataArray.length === 0) {
        MessageToast.show("No data available to export.");
        return;
      }

      const worksheet = XLSX.utils.json_to_sheet(this.dataArray);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "ExportedData");
      XLSX.writeFile(workbook, "ExportedData.xlsx");
    },


    onPreviewPDF: function () {
      const oModel = this.getView().getModel();
      const aData = oModel.getProperty("/dataArray");
   
      if (!aData || aData.length === 0) {
        sap.m.MessageToast.show("No data to generate PDF.");
        return;
      }
   
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      doc.text("Students Data", 14, 15);
   
      const headers = [["ID", "Name", "Email", "Department", "Year", "Contact"]];
      const rows = aData.map(item => [
        item.ID || "",
        item.Name || "",
        item.Email || "",
        item.Department || "",
        item.Year || "",
        item.Contact || ""
      ]);
   
      doc.autoTable({
        startY: 20,
        head: headers,
        body: rows
      });
   
      const pdfBlob = doc.output("blob");
      const blobUrl = URL.createObjectURL(pdfBlob);
   
      const oPDFViewer = new PDFViewer({
        source: blobUrl,
        title: "Preview - Uploaded Students PDF",
        showDownloadButton: true
      });
   
      this.getView().addDependent(oPDFViewer);
      oPDFViewer.open();
    }

  });
});
