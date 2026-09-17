// execution/frontend/src/components/LegalDocs.jsx
// Full-screen overlay showing the AI disclaimer, terms of use, and privacy policy.
// Accessed via Settings > Legal.

import { useState } from "react";
import { useTheme } from "../theme";

const DOCS = {
  disclaimer: {
    label: "AI Disclaimer",
    title: "AI Nutrition Estimate Disclaimer",
    sections: [
      {
        body: "Khaaya uses artificial intelligence (Google Gemini) to estimate calories, macronutrients, and food composition from the meal descriptions and photos you submit.\n\nPlease read and understand the following before relying on these estimates.",
      },
      {
        heading: "These Are Estimates, Not Verified Values",
        body: "Nutrition values shown in Khaaya are AI generated approximations based on pattern matching against known food data and general nutritional knowledge. They are not laboratory tested and can vary from the actual nutrient content of your meal due to:",
        list: [
          "Portion size interpretation",
          "Recipe and ingredient variation",
          "Cooking method and oil quantity",
          "Regional and homemade recipe differences",
          "Limitations of the underlying AI model",
        ],
      },
      {
        heading: "Not Medical or Dietary Advice",
        body: "Khaaya is a personal tracking tool. It is not:",
        list: [
          "A medical device",
          "A substitute for consultation with a doctor, dietitian, or nutritionist",
          "A diagnostic or treatment tool for any health condition, including diabetes, eating disorders, or allergies",
        ],
        after: "If you have a medical condition, food allergy, or are pregnant, nursing, or under the care of a healthcare provider for dietary reasons, consult that provider before using Khaaya to guide your nutrition decisions.",
      },
      {
        heading: "Use Your Judgment",
        body: "Treat all calorie and macro figures as directional guidance for building awareness of your eating patterns, not as precise or guaranteed numbers. If a figure looks clearly wrong, use the edit feature to correct it, and consider reporting it so we can improve accuracy.",
      },
      {
        heading: "No Liability",
        body: "By using Khaaya, you acknowledge that you are relying on AI generated estimates at your own discretion, and that Khaaya is not responsible for outcomes resulting from decisions based on these estimates.\n\nThis disclaimer is incorporated into and should be read alongside our Terms of Use and Privacy Policy.",
      },
    ],
  },
  terms: {
    label: "Terms of Use",
    title: "Terms of Use",
    updated: "Last Updated: September 15, 2026",
    sections: [
      {
        body: 'Please read these Terms of Use ("Terms") carefully before using Khaaya (the "Service"), operated by Khaaya ("we," "our," or "us").\n\nBy creating an account or using Khaaya, you agree to be bound by these Terms. If you do not agree, do not use the Service.',
      },
      { heading: "1. Eligibility", body: "You must be at least 16 years old to use Khaaya. By using the Service, you confirm that you meet this requirement." },
      { heading: "2. Description of Service", body: "Khaaya is a nutrition tracking application that allows users to log meals, estimate calories and macronutrients using AI powered parsing, track body weight, and monitor progress toward personal nutrition goals." },
      { heading: "3. Not Medical Advice", body: "Khaaya provides estimates for informational and personal tracking purposes only. It is not a substitute for professional medical, nutritional, or dietary advice. See our full disclaimer for details. Always consult a qualified healthcare provider before making decisions about your diet, weight, or health." },
      {
        heading: "4. Your Account",
        list: [
          "You are responsible for maintaining the confidentiality of your login credentials.",
          "You are responsible for all activity that occurs under your account.",
          "You agree to provide accurate information when creating your account.",
          "You must notify us promptly of any unauthorized use of your account.",
        ],
      },
      {
        heading: "5. Acceptable Use",
        body: "You agree not to:",
        list: [
          "Use the Service for any unlawful purpose",
          "Attempt to reverse engineer, scrape, or extract the underlying food database or AI systems",
          "Upload harmful, offensive, or infringing content, including meal photos that violate others' rights",
          "Interfere with or disrupt the Service's infrastructure",
          "Impersonate another person or misrepresent your identity",
        ],
      },
      {
        heading: "6. AI Generated Content",
        body: "Nutrition estimates, calorie counts, and macro breakdowns are generated using third party AI models and may contain errors. You acknowledge that:",
        list: [
          "AI estimates are approximations, not verified laboratory values",
          "You are responsible for how you use these estimates",
          "We are not liable for decisions made based on AI generated nutrition data",
        ],
      },
      { heading: "7. User Content", body: "You retain ownership of any content you submit, including meal descriptions and photos. By submitting content, you grant us a limited, non exclusive license to use, store, and process that content for the purpose of operating and improving the Service, including improving food recognition accuracy." },
      {
        heading: "8. Subscription and Payments (if applicable)",
        body: "If Khaaya offers a premium tier:",
        list: [
          "Fees are billed in advance on a recurring basis unless otherwise stated",
          "Payments are processed through Stripe or another listed provider",
          "You may cancel your subscription at any time; cancellation takes effect at the end of the current billing period",
          "Fees are generally non refundable except where required by law",
        ],
      },
      { heading: "9. Intellectual Property", body: "The Khaaya name, logo, design, software, and underlying food database (excluding open data sources such as IFCT or USDA FoodData Central) are the property of Khaaya. You may not copy, modify, or distribute any part of the Service without permission." },
      { heading: "10. Termination", body: "We may suspend or terminate your account if you violate these Terms or misuse the Service. You may delete your account at any time through the app or by contacting support." },
      { heading: "11. Disclaimer of Warranties", body: 'The Service is provided "as is" and "as available" without warranties of any kind, express or implied. We do not guarantee that the Service will be uninterrupted, error free, or that nutrition estimates will be accurate.' },
      { heading: "12. Limitation of Liability", body: "To the maximum extent permitted by law, Khaaya shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Service, including but not limited to health outcomes resulting from reliance on AI generated nutrition estimates." },
      { heading: "13. Governing Law", body: "These Terms are governed by the laws of India, without regard to conflict of law principles." },
      { heading: "14. Changes to These Terms", body: "We may update these Terms from time to time. Continued use of the Service after changes take effect constitutes acceptance of the revised Terms." },
      { heading: "15. Contact Us", body: "For questions about these Terms, contact:\nsupport@khaaya.app\nKhaaya" },
    ],
  },
  privacy: {
    label: "Privacy Policy",
    title: "Privacy Policy",
    updated: "Last Updated: September 15, 2026",
    sections: [
      {
        body: 'Khaaya ("we," "our," or "us") operates the Khaaya nutrition tracking application (the "Service"). This Privacy Policy explains what information we collect, how we use it, and the choices you have.\n\nBy using Khaaya, you agree to the collection and use of information as described in this policy.',
      },
      {
        heading: "1. Information We Collect",
        body: "1.1 Account Information\nWhen you create an account, we collect:",
        list: ["Email address", "Password (stored securely via Firebase Authentication and never in plain text)", "Display name (if provided)"],
        after: "1.2 Health and Personal Data\nTo provide meal tracking and nutrition features, we collect:",
      },
      {
        list: [
          "Body weight entries",
          "Height, age, sex, and activity level (if provided for goal calculations)",
          "Nutrition and dietary goals (calorie targets, macro targets)",
          "Meal logs, including food names, quantities, and timestamps",
          "Photos of meals, if you choose to upload them",
          "Text descriptions of meals you submit for AI parsing",
        ],
        after: "This information is considered sensitive personal and health related data in many jurisdictions. We treat it accordingly and limit access to what is necessary to run the Service.\n\n1.3 Automatically Collected Information\nWe may collect:",
      },
      {
        list: ["Device and browser type", "IP address", "Usage data such as pages visited and features used", "Log data for debugging and security purposes"],
        after: "1.4 Information from Third Party AI Processing\nWhen you log a meal using natural language or photo input, that content is sent to our AI food parsing provider (currently Google Gemini) to extract nutrition estimates. See Section 4 for details.",
      },
      {
        heading: "2. How We Use Your Information",
        body: "We use collected information to:",
        list: [
          "Create and manage your account",
          "Calculate and display nutrition and macro estimates",
          "Track your logged meals, weight, and progress over time",
          "Improve the accuracy of our food recognition and database",
          "Communicate with you about the Service, including updates and support",
          "Detect, prevent, and address technical issues or misuse",
          "Comply with legal obligations",
        ],
        after: "We do not sell your personal data.",
      },
      {
        heading: "3. Legal Basis for Processing (EEA/UK Users)",
        body: "If you are located in the European Economic Area or United Kingdom, our legal bases for processing your data include:",
        list: [
          "Performance of a contract (providing the Service you signed up for)",
          "Consent (for optional features such as photo uploads)",
          "Legitimate interests (improving and securing the Service)",
          "Legal obligation (where applicable)",
        ],
      },
      {
        heading: "4. Third Party Service Providers",
        body: "We share data with the following categories of service providers, only as needed to operate the Service:",
        list: [
          "Firebase (Google) — Authentication, database hosting — Account info, meal logs, weight data",
          "Google Gemini API — AI food parsing from text/photo input — Meal descriptions, photos submitted for parsing",
          "Railway — Backend hosting — Server logs, request data",
          "Stripe (if applicable) — Payment processing for premium features — Billing information, not full card numbers",
        ],
        after: "These providers are contractually bound to protect your data and may only use it to provide services to us. We do not control how third party AI providers may use data at the infrastructure level, and you should review their own privacy terms where linked.",
      },
      { heading: "5. Data Retention", body: "We retain your account and meal log data for as long as your account remains active. If you delete your account, we will delete or anonymize your personal data within 30 days, except where retention is required for legal or security purposes." },
      {
        heading: "6. Your Rights",
        body: "Depending on your location, you may have the right to:",
        list: [
          "Access the personal data we hold about you",
          "Correct inaccurate data",
          "Request deletion of your data",
          "Export your data in a portable format",
          "Withdraw consent for optional processing",
          "Object to certain processing",
        ],
        after: "To exercise these rights, contact us at support@khaaya.app.",
      },
      { heading: "7. Data Security", body: "We use industry standard measures, including encrypted connections and Firebase's built in security rules, to protect your data. No method of transmission or storage is completely secure, and we cannot guarantee absolute security." },
      { heading: "8. Children's Privacy", body: "Khaaya is not intended for users under the age of 16. We do not knowingly collect data from children. If you believe a child has provided us with personal data, contact us and we will delete it." },
      { heading: "9. International Data Transfers", body: "Your data may be processed in countries other than your own, including the United States, where our hosting and AI providers operate. By using the Service, you consent to this transfer." },
      { heading: "10. Changes to This Policy", body: "We may update this Privacy Policy periodically. Material changes will be communicated through the app or by email. Continued use of the Service after changes take effect constitutes acceptance." },
      { heading: "11. Contact Us", body: "For questions about this Privacy Policy or your data, contact:\nsupport@khaaya.app\nKhaaya\nPune, India" },
    ],
  },
};

export default function LegalDocs({ initialDoc = "disclaimer", onClose }) {
  const { T } = useTheme();
  const [active, setActive] = useState(initialDoc);
  const doc = DOCS[active];

  const S = {
    overlay: {
      position: "fixed", inset: 0, background: T.bg, zIndex: 100,
      overflowY: "auto", fontFamily: "system-ui, -apple-system, sans-serif",
    },
    header: {
      background: T.card, borderBottom: `1px solid ${T.headerBorder}`,
      padding: "12px 20px", position: "sticky", top: 0, zIndex: 10,
    },
    headerInner: {
      maxWidth: 480, margin: "0 auto",
      display: "flex", justifyContent: "space-between", alignItems: "center",
    },
    tabs: { maxWidth: 480, margin: "0 auto", padding: "14px 16px 0" },
    tabRow: { display: "flex", gap: 0, background: T.segBg, borderRadius: 10, padding: 3 },
    tabBtn: (key) => ({
      flex: 1, padding: "9px 4px", borderRadius: 8, border: "none",
      background: active === key ? T.segActive : "transparent",
      color: active === key ? T.segActiveText : T.segText,
      cursor: "pointer", fontSize: 13, fontWeight: active === key ? 600 : 400,
      transition: "all 0.2s",
    }),
    body: { maxWidth: 480, margin: "0 auto", padding: "20px 16px 56px" },
    heading: { fontSize: 15, fontWeight: 700, color: T.text, margin: "22px 0 8px" },
    p: { fontSize: 14, color: T.textSec, lineHeight: 1.6, whiteSpace: "pre-line", margin: "0 0 4px" },
    li: { fontSize: 14, color: T.textSec, lineHeight: 1.6, margin: "4px 0", paddingLeft: 2 },
  };

  return (
    <div style={S.overlay}>
      <div style={S.header}>
        <div style={S.headerInner}>
          <div style={{ fontWeight: 800, fontSize: 20, color: T.text, letterSpacing: -0.3 }}>Legal</div>
          <button
            onClick={onClose}
            style={{ background: T.inputBg, border: "none", borderRadius: 10, width: 36, height: 36, color: T.textSec, cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            ✕
          </button>
        </div>
      </div>

      <div style={S.tabs}>
        <div style={S.tabRow}>
          {Object.entries(DOCS).map(([key, d]) => (
            <button key={key} style={S.tabBtn(key)} onClick={() => setActive(key)}>
              {d.label}
            </button>
          ))}
        </div>
      </div>

      <div style={S.body}>
        <div style={{ fontSize: 22, fontWeight: 800, color: T.text, letterSpacing: -0.3, margin: "8px 0 2px" }}>
          {doc.title}
        </div>
        {doc.updated && <div style={{ fontSize: 12, color: T.textSec, marginBottom: 8 }}>{doc.updated}</div>}

        {doc.sections.map((sec, i) => (
          <div key={i}>
            {sec.heading && <div style={S.heading}>{sec.heading}</div>}
            {sec.body && <p style={S.p}>{sec.body}</p>}
            {sec.list && (
              <ul style={{ margin: "6px 0", paddingLeft: 20 }}>
                {sec.list.map((item, j) => (
                  <li key={j} style={S.li}>{item}</li>
                ))}
              </ul>
            )}
            {sec.after && <p style={S.p}>{sec.after}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
