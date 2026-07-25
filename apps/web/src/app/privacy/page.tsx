import { LegalPage } from "@/components/legal/legal-page";

export const metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="YOUR PRIVACY"
      title="Privacy Policy"
      summary="This policy describes the customer information Talomart uses to operate accounts, fulfil orders and improve the shopping experience."
      effectiveDate="22 July 2026"
      sections={[
        {
          title: "Information we collect",
          paragraphs: [
            "We collect details you provide, such as your name, email address, phone number, delivery address, account preferences and order information.",
            "We may also receive technical information needed to keep sessions secure, diagnose errors and understand how the storefront performs."
          ]
        },
        {
          title: "How we use information",
          paragraphs: [
            "We use customer information to create and secure accounts, process checkout, fulfil and track orders, provide support, prevent fraud and improve Talomart services.",
            "If you separately opt in to marketing, we may send occasional offers or product updates. Creating an account does not require marketing consent."
          ]
        },
        {
          title: "When information is shared",
          paragraphs: [
            "We share only the information reasonably needed by service providers that help operate Talomart, such as payment, hosting, communications and delivery partners.",
            "We may also disclose information where required by law, to protect customers and Talomart, or as part of a legitimate business reorganization with appropriate safeguards."
          ]
        },
        {
          title: "Security and retention",
          paragraphs: [
            "Talomart uses access controls, protected sessions and operational safeguards designed to reduce unauthorized access. No internet service can promise absolute security, so customers should also use strong, private passwords.",
            "We keep information only for as long as it is reasonably needed for orders, customer service, security, accounting and legal obligations."
          ]
        },
        {
          title: "Your choices",
          paragraphs: [
            "You can checkout without creating an account, choose whether to receive marketing, and ask Customer Care about your stored customer details.",
            "Essential order and security communications are different from optional marketing and may still be sent when needed to complete a transaction or protect an account."
          ]
        },
        {
          title: "Policy updates and contact",
          paragraphs: [
            "We may update this policy when our services or privacy practices change. The effective date above identifies the current version presented during account creation.",
            "For privacy questions or requests, contact Talomart Customer Care using the support details shown on the storefront."
          ]
        }
      ]}
    />
  );
}
