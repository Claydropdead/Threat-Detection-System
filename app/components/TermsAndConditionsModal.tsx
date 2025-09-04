"use client";

import { useState, useEffect, useRef } from 'react';
import { saveUserConsent, hasUserConsent } from '../utils/consentManager';

interface TermsAndConditionsModalProps {
  isOpen: boolean;
  onAccept: () => void;
  onClose: () => void;
}

export default function TermsAndConditionsModal({ 
  isOpen, 
  onAccept, 
  onClose 
}: TermsAndConditionsModalProps) {
  const [language, setLanguage] = useState<'english' | 'tagalog'>('english');
  const [alreadyAccepted, setAlreadyAccepted] = useState(false);  // Check if terms have already been accepted
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Our enhanced hasUserConsent now checks all storage types
      const isAccepted = hasUserConsent('termsAndConditions');
      setAlreadyAccepted(isAccepted);
    }
  }, [isOpen]);

  // Reset scroll state when modal opens or language changes
  useEffect(() => {
    if (isOpen) {
      setHasScrolledToBottom(false);
      // Check if content is already at bottom (in case content is short)
      setTimeout(() => {
        checkScrollPosition();
      }, 100);
    }
  }, [isOpen, language]);

  // Function to check if user has scrolled to bottom
  const checkScrollPosition = () => {
    if (scrollContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
      const isScrolledToBottom = scrollTop + clientHeight >= scrollHeight - 10; // 10px threshold
      setHasScrolledToBottom(isScrolledToBottom);
    }
  };

  // Handle scroll events
  const handleScroll = () => {
    checkScrollPosition();
  };

  // Close modal with ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[100] flex items-start sm:items-center justify-center overflow-y-auto p-4 pb-8">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full mt-16 sm:mt-8 mx-4 mb-4 flex flex-col">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {language === 'english' ? 'Terms and Conditions' : 'Mga Tuntunin at Kondisyon'}
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => setLanguage('english')}
              className={`px-3 py-1 rounded text-sm ${
                language === 'english'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
              }`}
            >
              English
            </button>
            <button
              onClick={() => setLanguage('tagalog')}
              className={`px-3 py-1 rounded text-sm ${
                language === 'tagalog'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
              }`}
            >
              Tagalog
            </button>
          </div>
        </div>
          <div 
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="p-6 overflow-y-auto max-h-[50vh] sm:max-h-[60vh] md:max-h-[65vh] overflow-x-hidden"
          >
          {language === 'english' ? (            <div className="space-y-4 text-gray-700 dark:text-gray-300">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">CyberSafe 4B Terms and Conditions</h3>
              
              <p className="text-sm italic mb-4">Last Updated: June 23, 2025</p>
              
              <p>By using CyberSafe 4B's cybersecurity threat analysis service, operated by the Regional Information and Communications Technology Management Division (RICTMD) under Police Regional Office 4B – MIMAROPA, you agree to the following terms and conditions:</p>
              
              <h4 className="font-semibold mt-4">1. Service Description and Purpose</h4>
              <p>CyberSafe 4B is an AI-powered cybersecurity awareness tool designed to help identify potential threats in digital content including text messages, emails, images, audio recordings, and website URLs. This service is provided for educational and informational purposes to enhance cybersecurity awareness among Filipino communities, particularly in the MIMAROPA region.</p>
              
              <h4 className="font-semibold mt-4">2. Educational Nature and Limitations</h4>
              <p>This service provides <strong>educational assessments only</strong> and should not be considered as:</p>
              <ul className="list-disc ml-5 space-y-1">
                <li>Definitive legal, financial, or professional advice</li>
                <li>Replacement for official law enforcement investigation</li>
                <li>Guaranteed protection against all cyber threats</li>
                <li>Substitute for professional cybersecurity consultation</li>
              </ul>
              
              <h4 className="font-semibold mt-4">3. Accuracy and Reliability</h4>
              <p>While we employ advanced AI technology and maintain high standards, CyberSafe 4B:</p>
              <ul className="list-disc ml-5 space-y-1">
                <li>Cannot guarantee 100% accuracy in threat detection</li>
                <li>May produce false positives (flagging safe content as risky) or false negatives (missing actual threats)</li>
                <li>Relies on AI analysis that may be influenced by content complexity, language variations, or novel threat techniques</li>
                <li>Should be used alongside, not instead of, critical thinking and verification from multiple sources</li>
              </ul>
              
              <h4 className="font-semibold mt-4">4. Data Processing and Privacy</h4>
              <p>When you submit content for analysis:</p>
              <ul className="list-disc ml-5 space-y-1">
                <li><strong>Processing:</strong> Your submitted content (text, images, audio, URLs) is processed temporarily by the Google Gemini API to perform threat analysis</li>
                <li><strong>No Data Storage:</strong> Our system does not store any of your submitted content - all processing is done in real-time and content is immediately discarded after analysis</li>
                <li><strong>Third-Party Processing:</strong> Content is sent to Google's Gemini API for analysis according to Google's privacy policies and data handling practices</li>
                <li><strong>No Personal Data Sale:</strong> We never sell or share your personal information with third parties for commercial purposes</li>
                <li><strong>No Data Retention:</strong> As our system does not store data, there is no long-term data retention or government access to stored content</li>
              </ul>
              
              <h4 className="font-semibold mt-4">5. User Responsibilities and Prohibited Uses</h4>
              <p>Users must:</p>
              <ul className="list-disc ml-5 space-y-1">
                <li>Provide content lawfully obtained and owned by them or with proper authorization</li>
                <li>Not submit content containing personal information of others without consent</li>
                <li>Not attempt to test, hack, or exploit the service for malicious purposes</li>
                <li>Not use the service to harass, defame, or harm others</li>
                <li>Comply with all applicable Philippine and international laws</li>
                <li>Not submit copyrighted material without proper authorization</li>
                <li>Use the service responsibly and in good faith for legitimate cybersecurity purposes</li>
              </ul>
              
              <h4 className="font-semibold mt-4">6. Feedback and Communication</h4>
              <p>By using our feedback feature, you agree that:</p>
              <ul className="list-disc ml-5 space-y-1">
                <li>Feedback may be used to improve our services</li>
                <li>We may contact you regarding your feedback using the provided contact information</li>
                <li>Your feedback helps enhance cybersecurity protection for all Filipino users</li>
              </ul>
              
              <h4 className="font-semibold mt-4">7. Limitation of Liability</h4>
              <p>CyberSafe 4B, RICTMD, PNP PRO4B-MIMAROPA, and related personnel shall not be liable for:</p>
              <ul className="list-disc ml-5 space-y-1">
                <li>Any direct, indirect, incidental, special, or consequential damages</li>
                <li>Financial losses resulting from actions taken based on our analysis</li>
                <li>Damages from undetected threats or false threat assessments</li>
                <li>Service interruptions, technical failures, or system errors</li>
                <li>Third-party actions or services integrated with our platform</li>
              </ul>
              
              <h4 className="font-semibold mt-4">8. Service Availability and Modifications</h4>
              <p>We reserve the right to:</p>
              <ul className="list-disc ml-5 space-y-1">
                <li>Modify, suspend, or discontinue the service at any time</li>
                <li>Update our analysis algorithms and detection methods</li>
                <li>Implement usage limits or access restrictions as needed</li>
                <li>Change these terms with notice to users</li>
              </ul>
              
              <h4 className="font-semibold mt-4">9. Governing Law and Jurisdiction</h4>
              <p>These terms are governed by the laws of the Republic of the Philippines. Any disputes shall be resolved in the courts of the Philippines, with preference for the jurisdiction covering the MIMAROPA region.</p>
              
              <h4 className="font-semibold mt-4">10. Contact and Reporting</h4>
              <p>For questions about these terms or to report issues, contact us through the feedback feature or reach out to RICTMD PRO4B-MIMAROPA through official channels.</p>
            </div>
          ) : (
            <div className="space-y-4 text-gray-700 dark:text-gray-300">              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Mga Tuntunin at Kondisyon ng CyberSafe 4B</h3>
              
              <p className="text-sm italic mb-4">Huling Na-update: Hunyo 23, 2025</p>
              
              <p>Sa paggamit ng serbisyo ng pagsusuri ng cybersecurity threats ng CyberSafe 4B, na pinapaandar ng Regional Information and Communications Technology Management Division (RICTMD) sa ilalim ng Police Regional Office 4B – MIMAROPA, sumasang-ayon ka sa mga sumusunod na tuntunin at kondisyon:</p>
              
              <h4 className="font-semibold mt-4">1. Paglalarawan at Layunin ng Serbisyo</h4>
              <p>Ang CyberSafe 4B ay isang AI-powered na cybersecurity awareness tool na dinisenyo upang matulungan ang pagtukoy ng mga potensyal na threats sa digital content kabilang ang mga text message, email, larawan, audio recording, at website URL. Ang serbisyong ito ay ibinibigay para sa layuning pang-edukasyon at pagbibigay-kaalaman upang mapahusay ang cybersecurity awareness sa mga komunidad ng mga Pilipino, lalo na sa rehiyon ng MIMAROPA.</p>
              
              <h4 className="font-semibold mt-4">2. Katangian ng Edukasyon at mga Limitasyon</h4>
              <p>Ang serbisyong ito ay nagbibigay ng <strong>mga pang-edukasyong pagtatasa lamang</strong> at hindi dapat ituring bilang:</p>
              <ul className="list-disc ml-5 space-y-1">
                <li>Tiyak na legal, pinansyal, o propesyonal na payo</li>
                <li>Kapalit ng opisyal na imbestigasyon ng law enforcement</li>
                <li>Garantisadong proteksyon laban sa lahat ng cyber threats</li>
                <li>Kapalit ng propesyonal na cybersecurity consultation</li>
              </ul>
              
              <h4 className="font-semibold mt-4">3. Katumpakan at Reliability</h4>
              <p>Bagaman gumagamit kami ng advanced AI technology at nananatiling mataas ang aming mga pamantayan, ang CyberSafe 4B:</p>
              <ul className="list-disc ml-5 space-y-1">
                <li>Hindi makakagarantiya ng 100% na katumpakan sa pagtukoy ng threats</li>
                <li>Maaaring mag-produce ng false positives (pag-flag ng safe content bilang delikado) o false negatives (hindi makita ang tunay na threats)</li>
                <li>Umaasa sa AI analysis na maaaring ma-impluwensyahan ng complexity ng content, variations ng wika, o mga bagong threat techniques</li>
                <li>Dapat gamitin kasama, hindi kapalit, ng critical thinking at verification mula sa maraming sources</li>
              </ul>
              
              <h4 className="font-semibold mt-4">4. Data Processing at Privacy</h4>
              <p>Kapag nagsumite ka ng content para sa analysis:</p>
              <ul className="list-disc ml-5 space-y-1">
                <li><strong>Processing:</strong> Ang inyong naisubmit na content (text, images, audio, URLs) ay pinoproseso nang pansamantala ng Google Gemini API upang magsagawa ng threat analysis</li>
                <li><strong>Walang Data Storage:</strong> Ang aming system ay hindi nag-iimbak ng anumang content na inyong naisubmit - lahat ng processing ay ginagawa nang real-time at ang content ay agad na tinatanggal pagkatapos ng analysis</li>
                <li><strong>Third-Party Processing:</strong> Ang content ay ipinapadala sa Google's Gemini API para sa analysis ayon sa privacy policies at data handling practices ng Google</li>
                <li><strong>Walang Personal Data Sale:</strong> Hindi namin kailanman ibinebenta o ibinabahagi ang inyong personal information sa mga third parties para sa commercial purposes</li>
                <li><strong>Walang Data Retention:</strong> Dahil ang aming system ay hindi nag-iimbak ng data, walang long-term data retention o government access sa naka-store na content</li>
              </ul>
              
              <h4 className="font-semibold mt-4">5. Mga Responsibilidad ng User at Prohibited Uses</h4>
              <p>Ang mga users ay dapat:</p>
              <ul className="list-disc ml-5 space-y-1">
                <li>Magbigay ng content na legal na nakuha at pag-aari nila o may tamang authorization</li>
                <li>Hindi magsumite ng content na naglalaman ng personal information ng iba nang walang consent</li>
                <li>Hindi subukang mag-test, hack, o mag-exploit ng service para sa malicious purposes</li>
                <li>Hindi gamitin ang service upang mang-harass, mang-defame, o manakit ng iba</li>
                <li>Sumunod sa lahat ng naaangkop na batas ng Pilipinas at international</li>
                <li>Hindi magsumite ng copyrighted material nang walang tamang authorization</li>
                <li>Gamitin ang service nang responsable at in good faith para sa mga legitimate cybersecurity purposes</li>
              </ul>
              
              <h4 className="font-semibold mt-4">6. Feedback at Komunikasyon</h4>
              <p>Sa paggamit ng aming feedback feature, sumasang-ayon kayo na:</p>
              <ul className="list-disc ml-5 space-y-1">
                <li>Ang feedback ay maaaring gamitin upang mapabuti ang aming mga serbisyo</li>
                <li>Maaari kaming makipag-ugnayan sa inyo tungkol sa inyong feedback gamit ang ibinigay na contact information</li>
                <li>Ang inyong feedback ay tumutulong na mapahusay ang cybersecurity protection para sa lahat ng Filipino users</li>
              </ul>
              
              <h4 className="font-semibold mt-4">7. Limitasyon ng Pananagutan</h4>
              <p>Ang CyberSafe 4B, RICTMD, PNP PRO4B-MIMAROPA, at mga kaugnay na personnel ay hindi mananagot para sa:</p>
              <ul className="list-disc ml-5 space-y-1">
                <li>Anumang direkta, hindi direkta, insidental, espesyal, o konsekwenteng pinsala</li>
                <li>Mga pinansyal na pagkalugi na nagresulta mula sa mga aksyong ginawa batay sa aming analysis</li>
                <li>Mga pinsala mula sa hindi natukoy na threats o maling threat assessments</li>
                <li>Mga service interruptions, technical failures, o system errors</li>
                <li>Mga aksyon o serbisyo ng third-party na naka-integrate sa aming platform</li>
              </ul>
              
              <h4 className="font-semibold mt-4">8. Service Availability at Modifications</h4>
              <p>Nakalaan ang aming karapatan na:</p>
              <ul className="list-disc ml-5 space-y-1">
                <li>Baguhin, suspindihin, o ihinto ang serbisyo anumang oras</li>
                <li>I-update ang aming analysis algorithms at detection methods</li>
                <li>Magpatupad ng usage limits o access restrictions kung kinakailangan</li>
                <li>Baguhin ang mga tuntuning ito na may abiso sa mga users</li>
              </ul>
              
              <h4 className="font-semibold mt-4">9. Governing Law at Jurisdiction</h4>
              <p>Ang mga tuntuning ito ay pinamamahalaan ng mga batas ng Republika ng Pilipinas. Ang anumang mga dispute ay malulutas sa mga hukuman ng Pilipinas, na may preference para sa jurisdiction na sumasaklaw sa rehiyon ng MIMAROPA.</p>
              
              <h4 className="font-semibold mt-4">10. Contact at Reporting</h4>
              <p>Para sa mga tanong tungkol sa mga tuntuning ito o para mag-report ng mga isyu, makipag-ugnayan sa amin sa pamamagitan ng feedback feature o makipag-ugnayan sa RICTMD PRO4B-MIMAROPA sa pamamagitan ng mga opisyal na channels.</p>
            </div>
          )}
        </div>        <div className="p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row gap-3 sm:gap-0 justify-between items-center">
          {alreadyAccepted ? (
            <div className="w-full flex justify-center">
              <button
                onClick={onClose}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {language === 'english' ? 'Close' : 'Isara'}
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={onClose}
                className="w-full sm:w-auto px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 order-2 sm:order-1"
              >
                {language === 'english' ? 'Decline' : 'Tanggihan'}
              </button>
              
              {/* Scroll indicator message */}
              {!hasScrolledToBottom && (
                <div className="w-full sm:w-auto text-center sm:text-left order-3 sm:order-2">
                  <p className="text-sm text-orange-600 dark:text-orange-400 mb-2">
                    {language === 'english' 
                      ? '⬇️ Please scroll down and read all terms to continue' 
                      : '⬇️ Mangyaring mag-scroll pababa at basahin ang lahat ng tuntunin upang magpatuloy'
                    }
                  </p>
                </div>
              )}
              
              <button
                onClick={() => {
                  // Save consent using our utility which now takes care of all formats
                  saveUserConsent('termsAndConditions');
                  // Set local state to immediately hide accept/decline buttons
                  setAlreadyAccepted(true);
                  // Notify parent component
                  onAccept();
                }}
                disabled={!hasScrolledToBottom}
                className={`w-full sm:w-auto px-4 py-2 rounded-md focus:outline-none focus:ring-2 order-1 sm:order-3 ${
                  hasScrolledToBottom
                    ? 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 cursor-pointer'
                    : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                }`}
              >
                {language === 'english' ? 'I Accept the Terms' : 'Tinatanggap Ko ang Mga Tuntunin'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
