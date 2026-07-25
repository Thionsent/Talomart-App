import { LegalPage } from "@/components/legal/legal-page";

export const metadata = { title: "Terms of Use" };

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="CUSTOMER TERMS"
      title="Terms of Use"
      summary="These terms explain the practical rules that apply when you browse Talomart, create an account or place an order with us."
      effectiveDate="22 July 2026"
      sections={[
        {
          title: "Using Talomart",
          paragraphs: [
            "You must provide accurate information when creating an account or placing an order. You are responsible for keeping your sign-in details private and for activity carried out through your account.",
            "You may browse and checkout as a guest. An account is optional unless a particular service clearly requires one."
          ]
        },
        {
          title: "Products, prices and availability",
          paragraphs: [
            "We aim to present accurate product descriptions, images, prices and stock levels. A product may become unavailable before an order is confirmed, and we will explain the available alternatives or cancellation options if that happens.",
            "Prices are shown in Kenyan shillings unless stated otherwise. Delivery fees and the final payable amount are shown before you place an order."
          ]
        },
        {
          title: "Orders and payment",
          paragraphs: [
            "Submitting checkout creates an order request. Talomart may contact you to confirm delivery details, payment or product availability before fulfilment.",
            "The payment status displayed on an order determines whether payment has been confirmed. For Cash on Delivery orders, payment is recorded after delivery or approved collection."
          ]
        },
        {
          title: "Delivery, cancellations and returns",
          paragraphs: [
            "Delivery estimates depend on destination, product availability and courier operations. Keep your phone available so the fulfilment team can coordinate delivery.",
            "Cancellation, return and refund eligibility may depend on the order stage, product condition and the reason for the request. Customer Care will explain the applicable process before an item is returned."
          ]
        },
        {
          title: "Fair and secure use",
          paragraphs: [
            "Do not misuse the site, attempt unauthorized access, interfere with checkout, submit fraudulent orders or use Talomart in a way that harms customers, staff or systems.",
            "We may protect, restrict or close access where reasonably necessary to prevent fraud, security threats or material misuse."
          ]
        },
        {
          title: "Updates and questions",
          paragraphs: [
            "We may update these terms as Talomart services change. The effective date on this page identifies the version that applies to new account acceptance.",
            "For questions about an order or these terms, contact Talomart Customer Care using the support details shown on the storefront."
          ]
        }
      ]}
    />
  );
}
