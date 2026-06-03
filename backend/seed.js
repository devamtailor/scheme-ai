import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Scheme from './models/Scheme.js';

dotenv.config();

const schemesList = [
  {
    name: "PM Scholarship",
    description: "Scholarship scheme for dependent wards and widows of ex-servicemen and Ex-Coast Guard personnel.",
    eligibility: {
      min_income: 0,
      max_income: 1000000,
      category: ["General", "OBC", "SC", "ST"],
      state: ["All"],
      profession: ["Student"]
    },
    benefits: "₹2,500/month for boys and ₹3,000/month for girls.",
    documents: ["Aadhaar", "Bank Account", "Marksheet", "Service Certificate"],
    application_steps: ["Visit Kendriya Sainik Board website", "Register online", "Upload required documents", "Submit for verification"],
    apply_link: "https://ksb.gov.in"
  },
  {
    name: "PM Kisan Samman Nidhi",
    description: "Financial benefit to landholding farmer families.",
    eligibility: {
      min_income: 0,
      max_income: 500000,
      category: ["General", "OBC", "SC", "ST"],
      state: ["All"],
      profession: ["Farmer"]
    },
    benefits: "₹6,000 per year in three equal installments of ₹2,000.",
    documents: ["Aadhaar", "Land holding papers", "Bank Account Details"],
    application_steps: ["Go to PM Kisan Portal", "Click on New Farmer Registration", "Fill details and submit Aadhaar authentication", "Submit"],
    apply_link: "https://pmkisan.gov.in/"
  },
  {
    name: "Startup India Seed Fund Scheme",
    description: "Provides financial assistance to startups for proof of concept, prototype development, product trials, etc.",
    eligibility: {
      min_income: 0,
      max_income: 999999999,
      category: ["General", "OBC", "SC", "ST"],
      state: ["All"],
      profession: ["Business Owner", "Self-employed"]
    },
    benefits: "Up to ₹20 Lakhs for validation and up to ₹50 Lakhs for market entry.",
    documents: ["Startup India Recognition Certificate", "Pitch Deck", "Incorporation details"],
    application_steps: ["Register on Startup India Portal", "Apply under Seed Fund Scheme", "Select Incubator", "Submit Application"],
    apply_link: "https://seedfund.startupindia.gov.in/"
  },
  {
    name: "Pradhan Mantri Mudra Yojana (PMMY)",
    description: "Loans up to 10 lakhs to non-corporate, non-farm small/micro enterprises.",
    eligibility: {
      min_income: 0,
      max_income: 999999999,
      category: ["General", "OBC", "SC", "ST"],
      state: ["All"],
      profession: ["Self-employed", "Business Owner"]
    },
    benefits: "Loans up to 10 Lakhs (Shishu, Kishore, Tarun categories) without collateral.",
    documents: ["ID Proof", "Address Proof", "Business Plan", "Project Report"],
    application_steps: ["Visit nearby bank/NBFC", "Submit MUDRA loan application", "Provide required business documents required by bank", "Sanction and Disbursal"],
    apply_link: "https://www.mudra.org.in/"
  },
  {
    name: "Skill India (PMKVY)",
    description: "Pradhan Mantri Kaushal Vikas Yojana to encourage youth to take up industry-relevant skill training.",
    eligibility: {
      min_income: 0,
      max_income: 999999999,
      category: ["General", "OBC", "SC", "ST"],
      state: ["All"],
      profession: ["Student", "Unemployed"]
    },
    benefits: "Free skill training, certification, and placement assistance.",
    documents: ["Aadhaar Card", "Bank Account", "Educational Certificates"],
    application_steps: ["Find nearby PMKVY training center", "Enroll in a course", "Complete training", "Get certified and placement support"],
    apply_link: "http://pmkvyofficial.org/"
  },
  {
    name: "Stand-Up India",
    description: "Facilitate bank loans between 10 lakh and 1 Crore to at least one SC or ST borrower and at least one woman borrower per bank branch.",
    eligibility: {
      min_income: 0,
      max_income: 999999999,
      category: ["SC", "ST"],
      state: ["All"],
      profession: ["Business Owner", "Self-employed"]
    },
    benefits: "Bank loan between 10 lakh and 1 Crore for setting up a greenfield enterprise.",
    documents: ["Business Plan", "Caste Certificate (if applicable)", "ID Proof", "Address Proof"],
    application_steps: ["Visit Stand-Up India portal or local bank branch", "Fill the application", "Submit project report", "Approval"],
    apply_link: "https://www.standupmitra.in/"
  },
  {
    name: "Ayushman Bharat",
    description: "National Health Protection Scheme providing health coverage.",
    eligibility: {
      min_income: 0,
      max_income: 500000,
      category: ["General", "OBC", "SC", "ST"],
      state: ["All"],
      profession: ["Farmer", "Unemployed", "Student", "Self-employed", "Salaried"]
    },
    benefits: "Health cover of ₹5 lakhs per family per year for secondary and tertiary care hospitalization.",
    documents: ["Aadhaar Card", "Ration Card", "Income Certificate"],
    application_steps: ["Check eligibility online", "Visit Ayushman Bharat impaneled hospital", "Verify identity", "Get e-card"],
    apply_link: "https://pmjay.gov.in/"
  },
  {
    name: "Pradhan Mantri Awas Yojana (PMAY)",
    description: "Housing for All scheme providing affordable housing to the urban and rural poor.",
    eligibility: {
      min_income: 0,
      max_income: 1800000,
      category: ["General", "OBC", "SC", "ST"],
      state: ["All"],
      profession: ["Salaried", "Self-employed", "Farmer", "Unemployed"]
    },
    benefits: "Interest subsidy on housing loan or direct financial assistance for house construction.",
    documents: ["Aadhaar Card", "Income Proof", "Bank Statement"],
    application_steps: ["Visit PMAY portal", "Apply online under Citizen Assessment", "Fill details and submit", "Track status"],
    apply_link: "https://pmaymis.gov.in/"
  },
  {
    name: "Sukanya Samriddhi Yojana",
    description: "Savings scheme targeted at the parents of girl children, to build a fund for their future education and marriage.",
    eligibility: {
      min_income: 0,
      max_income: 999999999,
      category: ["General", "OBC", "SC", "ST"],
      state: ["All"],
      profession: ["Salaried", "Self-employed", "Farmer", "Business Owner"]
    },
    benefits: "High interest rate and tax benefits under 80C. Maturity amount for girl child.",
    documents: ["Girl child birth certificate", "Parent ID proof", "Address Proof"],
    application_steps: ["Visit a post office or authorized bank branch", "Fill SSY account opening form", "Submit documents and initial deposit", "Account opened"],
    apply_link: "https://www.indiapost.gov.in/"
  },
  {
    name: "MGNREGA",
    description: "Mahatma Gandhi National Rural Employment Guarantee Act guarantees right to work.",
    eligibility: {
      min_income: 0,
      max_income: 300000,
      category: ["General", "OBC", "SC", "ST"],
      state: ["All"],
      profession: ["Unemployed", "Farmer"]
    },
    benefits: "At least 100 days of wage employment in a financial year to a rural household.",
    documents: ["Aadhaar", "Job Card Application", "Bank account"],
    application_steps: ["Register with Gram Panchayat", "Get Job Card", "Apply for work", "Receive wages in bank account within 15 days"],
    apply_link: "https://nrega.nic.in/"
  },
  {
    name: "Digital India Internship Scheme",
    description: "Provides an opportunity for students to secure first hand and practical work experience under the guidance of qualified and experienced Supervisor/Mentor.",
    eligibility: {
      min_income: 0,
      max_income: 999999999,
      category: ["General", "OBC", "SC", "ST"],
      state: ["All"],
      profession: ["Student"]
    },
    benefits: "Stipend of ₹10,000 per month.",
    documents: ["College Bonafide Certificate", "Marksheets", "Aadhaar"],
    application_steps: ["Visit MeitY portal", "Register for Digital India Internship", "Submit application", "Wait for selection list"],
    apply_link: "https://meity.gov.in/"
  },
  {
    name: "PM SVANidhi",
    description: "Provides affordable working capital loan to street vendors to resume their livelihoods.",
    eligibility: {
      min_income: 0,
      max_income: 500000,
      category: ["General", "OBC", "SC", "ST"],
      state: ["All"],
      profession: ["Self-employed", "Business Owner"]
    },
    benefits: "Working capital loan up to ₹10,000, with incentives for regular repayment and digital transactions.",
    documents: ["Aadhaar linked to mobile number", "Voter ID Card", "Bank Passbook"],
    application_steps: ["Visit PM SVANidhi portal", "Login with mobile number", "Fill application form", "Submit for bank processing"],
    apply_link: "https://pmsvanidhi.mohua.gov.in/"
  }
];

async function seedDB() {
  try {
    const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/schemeai';
    await mongoose.connect(mongoURI);
    console.log("Connected to MongoDB.");

    await Scheme.deleteMany({});
    console.log("Cleared existing schemes.");

    await Scheme.insertMany(schemesList);
    console.log("Seeded", schemesList.length, "schemes successfully.");

    process.exit(0);
  } catch (error) {
    console.error("Error seeding DB:", error);
    process.exit(1);
  }
}

seedDB();
