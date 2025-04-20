// components/PrivacyPolicy/PrivacyPolicy.js
import React from 'react';
import Head from 'next/head';
import { Wrapper, Container, Spacer } from '@/components/Layout'; // Adjust path if needed

// Optional: Add some basic styling via CSS Modules
// Create a file PrivacyPolicy.module.css in the same directory
// import styles from './PrivacyPolicy.module.css';

export default function PrivacyPolicy() {
  // --- Placeholder Variables (Replace these!) ---
  const effectiveDate = '[Date, e.g., April 20, 2025]';
  const websiteUrl = '[Your Website URL, e.g., https://lmlt.ai]';
  const companyName = '[Your Company Name]';
  const companyAddress = '[Your Company Address, if applicable]';
  const contactEmail = '[Your Contact Email Address, e.g., privacy@lmlt.ai]';
  const processingCountries =
    '[Specify countries, e.g., the United States, Canada]';
  // --- End Placeholders ---

  return (
    <>
      <Head>
        <title>Privacy Policy - Limelight</title>
        <meta
          name="description"
          content="Privacy Policy for the Limelight music platform."
        />
      </Head>

      <Wrapper>
        <Container
          style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem 1rem' }}
          // className={styles.privacyContainer} // Optional CSS Module class
        >
          <h1>Privacy Policy for Limelight</h1>
          <p>
            <strong>Effective Date:</strong> {effectiveDate}
          </p>

          <Spacer axis="vertical" size={1} />

          <section>
            <h2>1. Introduction</h2>
            <p>
              Welcome to Limelight ("Limelight," "we," "us," or "our").
              Limelight provides a platform ({websiteUrl}) for music artists
              ("Artists") to connect with fans ("Fans"), showcase music, launch
              and manage personalized tokens ("Artist Tokens"), and utilize our
              native token ("LMLT").
            </p>
            <p>
              This Privacy Policy describes how we collect, use, process, and
              disclose your information, including personal data, in conjunction
              with your access to and use of the Limelight platform and services
              (collectively, the "Services").
            </p>
            <p>
              By using our Services, you agree to the collection, use,
              disclosure, and procedures this Privacy Policy describes.
            </p>
          </section>

          <Spacer axis="vertical" size={1} />

          <section>
            <h2>2. Information We Collect</h2>
            <p>
              We collect information to provide and improve our Services. The
              types of information we collect include:
            </p>
            <h3>a. Information You Provide Directly:</h3>
            <ul>
              <li>
                <strong>Account Information:</strong> When you register for an
                account (as an Artist or Fan), we may collect information such
                as your username, email address, password, and profile picture.
              </li>
              <li>
                <strong>Profile Information:</strong> You may choose to provide
                additional information for your public profile, such as
                biographical details, links to social media, genre preferences,
                or other content.
              </li>
              <li>
                <strong>Artist Token Information:</strong> If you are an Artist
                launching a token, we collect the information you provide for
                the token setup (e.g., chosen token name).
              </li>
              <li>
                <strong>Wallet Information:</strong> To interact with LMLT or
                Artist Tokens, you will need to connect a compatible blockchain
                wallet. We will collect your public wallet address but{' '}
                <strong>we do not</strong> collect or store your private keys.
              </li>
              <li>
                <strong>Communications:</strong> If you contact us directly
                (e.g., for support), we may receive additional information about
                you, such as your name, email address, the contents of the
                message, and any attachments you may send us.
              </li>
              <li>
                <strong>Content:</strong> Information within the music,
                comments, posts, or other content you upload or share on the
                platform.
              </li>
            </ul>

            <h3>b. Information Collected Automatically:</h3>
            <ul>
              <li>
                <strong>Log Data and Usage Information:</strong> Like most
                websites and applications, we automatically collect log data
                when you access and use our Services. This may include your IP
                address, browser type, operating system, device information,
                referring/exit pages, pages visited, location (based on IP
                address), date/time stamps, and clickstream data. We also
                collect information about your interactions with the Services,
                such as features used, content viewed, searches performed, and
                token interactions (buys/sells initiated through our interface).
              </li>
              <li>
                <strong>Cookies and Similar Technologies:</strong> We use
                cookies (small text files placed on your device) and similar
                tracking technologies (like web beacons or pixels) to operate
                and personalize the Services, analyze usage, remember your
                preferences, and for security purposes. You can control the use
                of cookies at the individual browser level, but if you choose to
                disable cookies, it may limit your use of certain features or
                functions.
              </li>
            </ul>

            <h3>c. Information from Third Parties:</h3>
            <ul>
              <li>
                <strong>Blockchain Information:</strong> Transactions involving
                LMLT or Artist Tokens occur on a public blockchain (e.g.,
                Ethereum). While we do not control the blockchain, we may
                collect or access publicly available transaction data associated
                with your public wallet address when you interact with tokens
                via our Services. This data is inherently public.
              </li>
              <li>
                <strong>Payment Processors:</strong> If you pay fees (like the
                Artist Token launch fee), we use third-party payment processors
                (e.g., processing ETH transactions). These processors collect
                payment information directly and their use of your information
                is governed by their own privacy policies. We typically only
                receive confirmation of payment and limited transaction details.
              </li>
              <li>
                <strong>Analytics Providers:</strong> We may use third-party
                analytics services (e.g., Google Analytics) to help understand
                the use of our Services. These providers use cookies and similar
                technologies to collect and analyze usage data.
              </li>
            </ul>
          </section>

          <Spacer axis="vertical" size={1} />

          <section>
            <h2>3. How We Use Your Information</h2>
            <p>
              We use the information we collect for various purposes, including:
            </p>
            <ul>
              <li>To provide, operate, maintain, and improve our Services.</li>
              <li>
                To personalize your experience, such as suggesting content or
                features.
              </li>
              <li>
                To process transactions you initiate, including token launches
                and facilitating interactions with bonding curves via your
                connected wallet.
              </li>
              <li>
                To communicate with you, including responding to your inquiries,
                sending service-related announcements, updates, security alerts,
                and support messages.
              </li>
              <li>
                For marketing and promotional purposes (where permitted by law
                and with your consent where required).
              </li>
              <li>
                To monitor and analyze trends, usage, and activities in
                connection with our Services (e.g., calculating aggregate
                statistics like `totalUsers`, `totalArtists` shown on the site).
              </li>
              <li>
                For security purposes, including detecting and preventing fraud,
                abuse, and security incidents.
              </li>
              <li>
                To comply with legal obligations, enforce our terms of service,
                and protect our rights and the rights of others.
              </li>
            </ul>
          </section>

          <Spacer axis="vertical" size={1} />

          <section>
            <h2>4. How We Share Your Information</h2>
            <p>
              We do not sell your personal information. We may share the
              information we collect in the following circumstances:
            </p>
            <ul>
              <li>
                <strong>With Service Providers:</strong> We share information
                with third-party vendors, consultants, and other service
                providers who perform services on our behalf, such as hosting
                providers, analytics providers, payment processors, customer
                support tools, and security services. These providers only have
                access to the information necessary to perform their functions
                and are obligated to protect it.
              </li>
              <li>
                <strong>Publicly:</strong> Your profile information (username,
                profile picture, bio), content you post publicly (music,
                comments), and Artist Token details may be visible to other
                users and the public. Blockchain transactions associated with
                your public wallet address are inherently public.
              </li>
              <li>
                <strong>For Legal Reasons:</strong> We may disclose your
                information if required to do so by law or in the good faith
                belief that such action is necessary to comply with a legal
                obligation, protect and defend our rights or property, prevent
                fraud, act in urgent circumstances to protect the personal
                safety of users or the public, or protect against legal
                liability.
              </li>
              <li>
                <strong>Business Transfers:</strong> In connection with, or
                during negotiations of, any merger, sale of company assets,
                financing, or acquisition of all or a portion of our business by
                another company, your information may be transferred as part of
                that transaction.
              </li>
              <li>
                <strong>With Your Consent:</strong> We may share your
                information for other purposes with your explicit consent.
              </li>
            </ul>
          </section>

          <Spacer axis="vertical" size={1} />

          <section>
            <h2>5. Cookies and Tracking Technologies</h2>
            <p>
              We use cookies and similar technologies for purposes such as
              authentication, remembering user preferences, analyzing site
              traffic and trends, and understanding user interactions. You can
              manage your cookie preferences through your browser settings.
            </p>
          </section>

          <Spacer axis="vertical" size={1} />

          <section>
            <h2>6. Data Security</h2>
            <p>
              We implement reasonable administrative, technical, and physical
              security measures designed to protect your information from
              unauthorized access, disclosure, alteration, and destruction.
              However, no internet transmission or electronic storage is 100%
              secure. While we strive to protect your personal data, we cannot
              guarantee its absolute security. You are responsible for
              safeguarding your account credentials and your wallet's private
              keys.
            </p>
          </section>

          <Spacer axis="vertical" size={1} />

          <section>
            <h2>7. Data Retention</h2>
            <p>
              We retain your personal information for as long as necessary to
              fulfill the purposes outlined in this Privacy Policy, such as
              maintaining your account, providing the Services, complying with
              our legal obligations (including regulatory requirements for
              financial/token transactions), resolving disputes, and enforcing
              our agreements. Information on public blockchains is immutable and
              cannot be deleted by us.
            </p>
          </section>

          <Spacer axis="vertical" size={1} />

          <section>
            <h2>8. Your Privacy Rights</h2>
            <p>
              Depending on your location (e.g., GDPR in Europe, PIPEDA in
              Canada, CCPA in California), you may have certain rights regarding
              your personal information:
            </p>
            <ul>
              <li>
                <strong>Access:</strong> Request access to the personal
                information we hold about you.
              </li>
              <li>
                <strong>Correction:</strong> Request correction of inaccurate or
                incomplete information.
              </li>
              <li>
                <strong>Deletion:</strong> Request deletion of your personal
                information, subject to certain exceptions (e.g., legal
                retention requirements, blockchain data).
              </li>
              <li>
                <strong>Objection/Restriction:</strong> Object to or request
                restriction of certain processing activities.
              </li>
              <li>
                <strong>Data Portability:</strong> Request a copy of your data
                in a portable format.
              </li>
              <li>
                <strong>Withdraw Consent:</strong> Withdraw consent where
                processing is based on consent.
              </li>
            </ul>
            <p>
              To exercise these rights, please contact us using the details
              below. Note that disconnecting your wallet from our Services will
              stop future data collection related to that wallet via our
              interface, but does not affect past blockchain transactions or
              data already collected.
            </p>
          </section>

          <Spacer axis="vertical" size={1} />

          <section>
            <h2>9. Children's Privacy</h2>
            <p>
              Our Services are not directed to children under the age of 13 (or
              a higher age threshold where applicable by law, e.g., 16 in some
              jurisdictions). We do not knowingly collect personal information
              from children. If we become aware that we have collected personal
              information from a child without parental consent, we will take
              steps to delete such information.
            </p>
          </section>

          <Spacer axis="vertical" size={1} />

          <section>
            <h2>10. International Data Transfers</h2>
            <p>
              Your information may be transferred to, stored, and processed in
              countries other than your own, including {processingCountries},
              where our servers or service providers may be located. Data
              protection laws in these countries may differ from those in your
              jurisdiction. We will take appropriate safeguards to ensure your
              information remains protected in accordance with this Privacy
              Policy and applicable law.
            </p>
          </section>

          <Spacer axis="vertical" size={1} />

          <section>
            <h2>11. Blockchain Disclaimer</h2>
            <p>
              Your use of blockchain technology (e.g., interacting with LMLT or
              Artist Tokens) is subject to the inherent risks and
              characteristics of such technology. Transactions recorded on a
              blockchain are public, permanent, and generally cannot be altered
              or deleted. Limelight does not own or control the underlying
              blockchain network and is not responsible for its operation,
              security, or data processing.
            </p>
          </section>

          <Spacer axis="vertical" size={1} />

          <section>
            <h2>12. Changes to This Privacy Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. If we make
              material changes, we will notify you by revising the date at the
              top of the policy and, in some cases, we may provide additional
              notice (such as adding a statement to our homepage or sending you
              a notification). We encourage you to review this Privacy Policy
              periodically to stay informed about our practices.
            </p>
          </section>

          <Spacer axis="vertical" size={1} />

          <section>
            <h2>13. Contact Us</h2>
            <p>
              If you have any questions or concerns about this Privacy Policy or
              our data practices, please contact us at:
            </p>
            <p>
              {companyName}
              <br />
              {companyAddress && (
                <>
                  {companyAddress}
                  <br />
                </>
              )}
              {contactEmail}
            </p>
          </section>
        </Container>
      </Wrapper>
    </>
  );
}
