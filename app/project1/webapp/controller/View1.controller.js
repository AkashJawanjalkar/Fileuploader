sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/m/MessageToast"
], function (Controller, MessageToast) {
  "use strict";

  return Controller.extend("project1.controller.View1", {

    dataArray: [],

    onInit: function () {
      this.dataArray = [];
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

        console.log("Excel Data Array: ", that.dataArray);

        const oTable = that.getView().byId("excelTable");
        oTable.setVisible(true);

        // Post data
        that._postExcelData();
      };

      reader.readAsBinaryString(file);
    },

    _postExcelData: function () {
      const that = this;
      const serviceUrl = this.getOwnerComponent().getModel().sServiceUrl;
      const postUrl = `${serviceUrl}/Students`;  // Verify if the correct service URL is being used
      //const postUrl = `${serviceUrl}/odata/v4/studentapp/Students`;
      // remove any trailing “/” from serviceUrl, then append “/Students”
      // const postUrl = `${serviceUrl.replace(/\/$/, "")}/Students`;


      let successCount = 0;
      let errorCount = 0;
      const total = this.dataArray.length;
    
      // Logging the total data count
      console.log(`Total records to upload: ${total}`);
    
      this.dataArray.forEach(function (student, index) {
        console.log(`Uploading student data: ${JSON.stringify(student)}`);  // Log the data being uploaded
    
        $.ajax({
          url: postUrl,
          method: "POST",
          contentType: "application/json",
          data: JSON.stringify(student),  // Ensure that the data is in JSON format and matches your OData entity structure
          success: function () {
            successCount++;
            console.log(`Upload successful for student: ${student.Name}`);
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
    }

  });
});
