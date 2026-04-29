const mongoose = require("mongoose");

const patientReportSchema = new mongoose.Schema(
  {
    patientId: {
      type: String,
      required: true,
      trim: true,
    },
    patientName: {
      type: String,
      required: true,
      trim: true,
    },
    patientAge: {
      type: Number,
      required: true,
      min: 0,
    },
    patientGender: {
      type: String,
      required: true,
      trim: true,
    },
    lastAppointment: {
      type: Date,
      default: null,
    },
    doctorName: {
      type: String,
      required: true,
      trim: true,
    },
    appointmentDate: {
      type: Date,
      required: true,
    },
    bloodPressure: {
      type: String,
      required: true,
      trim: true,
    },
    cholesterol: {
      type: String,
      required: true,
      trim: true,
    },
    sugar: {
      type: String,
      required: true,
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("PatientReport", patientReportSchema);
