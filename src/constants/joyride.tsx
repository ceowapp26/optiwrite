import { BlockStack, Button, Icon, Text } from '@shopify/polaris';
import { WandIcon } from '@shopify/polaris-icons';

const FeatureItem = ({ icon, text }: { icon: string; text: string }) => (
  <BlockStack gap="200">
    <div style={{ 
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '8px',
      borderRadius: '8px',
      background: 'rgba(241, 242, 243, 0.8)'
    }}>
      <span style={{ fontSize: '20px' }}>{icon}</span>
      <Text variant="bodyMd">{text}</Text>
    </div>
  </BlockStack>
);

export const getWelcomeTourConfig = ({ stopTour, startTour }: TourProps): JoyrideConfig => {
  return {
    steps: [
      {
        target: '.Polaris-Page',
        content: (
          <BlockStack gap="400">
            <BlockStack gap="200" alignment="center">
              <Text variant="headingLg" as="h2" alignment="center">
                Welcome to Doc2Product! 🎉
              </Text>
              <Text variant="bodyMd" as="p" color="subdued" alignment="center">
                Your journey to effortless documentation starts here
              </Text>
            </BlockStack>
            <BlockStack gap="300">
              <FeatureItem 
                icon="✨"
                text="Effortlessly Transform Your Product Content"
              />
              <FeatureItem 
                icon="🚀"
                text="Boost Efficiency with AI-Powered Tools"
              />
              <FeatureItem 
                icon="🔄"
                text="Ensure Your Product is Always SEO-Optimized"
              />
            </BlockStack>
            <BlockStack gap="300">
              <Button
                primary
                size="large"
                fullWidth
                onClick={() => {
                  stopTour();
                  startTour('headerTour');
                }}
              >
                Start Interactive Tour
              </Button>
              <Button
                plain
                fullWidth
                onClick={() => stopTour()}
              >
                Skip Tour
              </Button>
            </BlockStack>
          </BlockStack>
        ),
        isModal: true,
        placement: 'center',
        disableBeacon: true,
        disableOverlayClose: true,
        hideCloseButton: true,
        spotlightClicks: false,
        spotlightPadding: 0,
        isFixed: true, 
        styles: {
          options: {
            arrowColor: '#fff',
            width: undefined,
            beaconSize: 36,
            spotlightShadow: '0 0 15px rgba(0, 0, 0, 0.5)',
            overlayColor: 'rgba(0, 0, 0, 0.5)',
            backgroundColor: '#F7FAFC', 
            primaryColor: '#000',
            textColor: '#004a14',
          },
          tooltip: {
            zIndex: 999999,
            borderRadius: '8px',
            padding: '24px',
            backgroundColor: 'var(--p-color-bg-surface)',
            maxWidth: '400px',
          },
        },
      },
    ],
    continuous: false,
    showProgress: false,
    showSkipButton: false,
  };
};

export const topbarTourConfig = {
  steps: [
    {
      target: '#theme-toogle',
      content: 'Toggle between light and dark mode',
      disableBeacon: true,
      placement: 'bottom',
      spotlightClicks: false,
      disableOverlayClose: true
    },
    {
      target: '#notification-btn',
      content: 'Stay updated with important notifications about your account and features',
      disableBeacon: true,
      placement: 'bottom',
      spotlightClicks: false,
      disableOverlayClose: true
    },
    {
      target: '#support-button',
      content: 'Need help? Access our support resources here',
      disableBeacon: true,
      placement: 'bottom',
      spotlightClicks: false,
      disableOverlayClose: true
    },
    {
      target: '#tour-button',
      content: 'Restart this tour anytime to learn about app features',
      disableBeacon: true,
      placement: 'bottom',
      spotlightClicks: false,
      disableOverlayClose: true
    }
  ],
  controlled: true,
  continuous: true,
  showProgress: true,
  showSkipButton: true,
  styles: {
    options: {
      arrowColor: 'var(--p-surface)',
      backgroundColor: 'var(--p-surface)',
      primaryColor: 'var(--p-action-primary)',
      textColor: 'var(--p-text)',
      overlayColor: 'rgba(0, 0, 0, 0.5)',
      spotlightShadow: '0 0 15px rgba(0, 0, 0, 0.5)',
      beaconSize: 36,
      zIndex: 100
    },
    tooltip: {
      padding: '16px',
      borderRadius: '8px',
      backgroundColor: 'var(--p-surface)',
    }
  }
};

export const headerTourConfig: JoyrideConfig = {
  steps: [
    {
      target: '#header',
      content: (
        <div className="flex justify-center px-4">
          <span className="text-start">Watch our quick demo and share your valuable feedback with us right here.</span>
        </div>
      ),
      placement: 'bottom',
      disableOverlayClose: true,
      spotlightClicks: false,
    },
    {
      target: '#watch-more',
      content: (
        <div className="flex justify-center px-4">
          <span className="text-start">Click "Watch More" to explore our short demo and see it in action.</span>
        </div>
      ),
      placement: 'bottom',
      disableOverlayClose: true,
      spotlightClicks: false,
    },
    {
      target: '#feedback',
      content: (
        <div className="flex justify-center px-4">
          <span className="text-start">Click "Feedback & Support" to share your feedback or request assistance.</span>
        </div>
      ),
      placement: 'bottom',
      disableOverlayClose: true,
      spotlightClicks: false,
    },
  ],
  controlled: true,
  continuous: true,
  showProgress: true,
  showSkipButton: true,
  disableOverlayClose: true,
};

export const userInfoTourConfig: JoyrideConfig = {
  steps: [
    {
      target: '#userInfo',
      content: (
        <div className="flex justify-center px-4">
          <span className="text-start">View usage details and manage your plan upgrades right here.</span>
        </div>
      ),
      placement: 'bottom',
      disableOverlayClose: true,
      spotlightClicks: false,
    },
    {
      target: '#active-account-info',
      content: (
        <div className="flex justify-center px-4">
          <span className="text-start">View and manage your active account here.</span>
        </div>
      ),
      disableOverlayClose: true,
      spotlightClicks: false,
    },
    {
      target: '#view-usage',
      content: (
        <div className="flex justify-center px-4">
          <span className="text-start">Click "View Usage" to manage your app activity.</span>
        </div>
      ),
      disableOverlayClose: true,
      spotlightClicks: true,
    },
    {
      target: '#upgrage-button',
      content: (
        <div className="flex justify-center px-4">
          <span className="text-start">Click "Upgrade" to manage or upgrade your subscription plan.</span>
        </div>
      ),
      disableOverlayClose: true,
      spotlightClicks: true,
    },
    {
      target: '#signout-button',
      content: (
        <div className="flex justify-center px-4">
          <span className="text-start">Sign out of your Google account if you are already logged in.</span>
        </div>
      ),
      disableOverlayClose: true,
      spotlightClicks: true,
    },
    {
      target: '#redirect-usage-page',
      content: (
        <div className="flex justify-center px-4">
          <span className="text-start">Click "Usage Statistics Page" to access usage details with comprehensive analysis.</span>
        </div>
      ),
      disableOverlayClose: true,
      spotlightClicks: true,
    },
    {
      target: '#view-ai-usage-details',
      content: (
        <div className="flex justify-center px-4">
          <span className="text-start">Click "View Details" to see AI usage details.</span>
        </div>
      ),
      disableOverlayClose: true,
      spotlightClicks: true,
    },
  ],
  controlled: true,
  continuous: true,
  showProgress: true,
  showSkipButton: true,
  disableOverlayClose: true,
};

export const importTourConfig: JoyrideConfig = {
  steps: [
    {
      target: '#import',
      content: (
        <div className="flex justify-center px-4">
          <span className="text-start">Import Google Docs or website URLs to convert into Shopify product content with AI.</span>
        </div>
      ),
      placement: 'bottom',
      disableOverlayClose: true,
      spotlightClicks: false,
    },
    {
      target: '#directlink',
      content: (
        <div className="flex justify-center px-4">
          <span className="text-start">Paste the URL here to convert the content.</span>
        </div>
      ),
      disableOverlayClose: true,
      spotlightClicks: false,
    },
    {
      target: '#importfile',
      content: (
        <div className="flex justify-center px-4">
          <span className="text-start">Select a Google Doc file to import.</span>
        </div>
      ),
      disableOverlayClose: true,
      spotlightClicks: true,
    },
    {
      target: '#importproduct',
      content: (
        <div className="flex justify-center px-4">
          <span className="text-start">Select an existing product from your Shopify store to optimize its content.</span>
        </div>
      ),
      disableOverlayClose: true,
      spotlightClicks: true,
    },
    {
      target: '#rawInput',
      content: (
        <div className="flex justify-center px-4">
          <span className="text-start">Your input data will be displayed here.</span>
        </div>
      ),
      disableOverlayClose: true,
      spotlightClicks: true,
    },
    {
      target: '#processedInput',
      content: (
        <div className="flex justify-center px-4">
          <span className="text-start">Your content has been automatically processed by AI and is displayed here.</span>
        </div>
      ),
      disableOverlayClose: true,
      spotlightClicks: true,
    },
    {
      target: '#PUBLISH_SIMPLE',
      content: (
        <div className="flex justify-center px-4">
          <span className="text-start">Click "PUBLISH" to make your product live.</span>
        </div>
      ),
      disableOverlayClose: true,
      spotlightClicks: true,
    },
    {
      target: '#CANCEL',
      content: (
        <div className="flex justify-center px-4">
          <span className="text-start">Click "CANCEL" to abort the publishing process.</span>
        </div>
      ),
      disableOverlayClose: true,
      spotlightClicks: true,
    },
  ],
  controlled: true,
  continuous: true,
  showProgress: true,
  showSkipButton: true,
  disableOverlayClose: true,
};

export const historyTourConfig: JoyrideConfig = {
  steps: [
    {
      target: '#history',
      content: (
        <div className="flex justify-center px-4">
          <span className="text-start">View and manage your activity history here.</span>
        </div>
      ),
      placement: 'bottom',
      disableOverlayClose: true,
      spotlightClicks: false,
    },
    {
      target: '#edit-product',
      content: (
        <div className="flex justify-center px-4">
          <span className="text-start">Edit published product.</span>
        </div>
      ),
      disableOverlayClose: true,
      spotlightClicks: false,
    },
    {
      target: '#delete-product',
      content: (
        <div className="flex justify-center px-4">
          <span className="text-start">Delete published product.</span>
        </div>
      ),
      disableOverlayClose: true,
      spotlightClicks: true,
    },
  ],
  controlled: true,
  continuous: true,
  showProgress: true,
  showSkipButton: true,
  disableOverlayClose: true,
};

export const aiseoTourConfig: JoyrideConfig = {
  steps: [
    {
      target: '#aiseo',
      content: (
        <div className="flex justify-center px-4">
          <span className="text-start">Advanced section for monitoring SEO-optimized content.</span>
        </div>
      ),
      placement: 'bottom',
      disableOverlayClose: true,
      spotlightClicks: false,
    },
    {
      target: '#advanced-editor-button',
      content: (
        <div className="flex justify-center px-4">
          <span className="text-start">Access advanced editor for comprehensive content editing with AI-powered tools.</span>
        </div>
      ),
      disableOverlayClose: true,
      spotlightClicks: false,
    },
    {
      target: '#refresh-allfields-button',
      content: (
        <div className="flex justify-center px-4">
          <span className="text-start">Regenerate all content with AI-powered capabilities.</span>
        </div>
      ),
      disableOverlayClose: true,
      spotlightClicks: true,
    },
    {
      target: '#generate-singlefield-button',
      content: (
        <div className="flex justify-center px-4">
          <span className="text-start">Regenerate content for a single field.</span>
        </div>
      ),
      disableOverlayClose: true,
      spotlightClicks: true,
    },
    {
      target: '#show-results-button',
      content: (
        <div className="flex justify-center px-4">
          <span className="text-start">Toggle between preview and edit mode to effortlessly view and modify generated content.</span>
        </div>
      ),
      disableOverlayClose: true,
      spotlightClicks: true,
    },
    {
      target: '#template-picker',
      content: (
        <div className="flex justify-center px-4">
          <span className="text-start">Choose a template from the available options to customize the appearance of your product content.</span>
        </div>
      ),
      disableOverlayClose: true,
      spotlightClicks: true,
    },
    {
      target: '#layout-picker',
      content: (
        <div className="flex justify-center px-4">
          <span className="text-start">Choose how the content layout should appear by adding or removing sections/items.</span>
        </div>
      ),
      disableOverlayClose: true,
      spotlightClicks: true,
    },
    {
      target: '#current-mode',
      content: (
        <div className="flex justify-center px-4">
          <span className="text-start">View your current mode.</span>
        </div>
      ),
      disableOverlayClose: true,
      spotlightClicks: true,
    },
    {
      target: '#PUBLISH_SEO',
      content: (
        <div className="flex justify-center px-4">
          <span className="text-start">Click 'PUBLISH' to make your product live.</span>
        </div>
      ),
      disableOverlayClose: true,
      spotlightClicks: true,
    },
    {
      target: '#CANCEL',
      content: (
        <div className="flex justify-center px-4">
          <span className="text-start">Click 'CANCEL' to abort the publishing process.</span>
        </div>
      ),
      disableOverlayClose: true,
      spotlightClicks: true,
    },
  ],
  controlled: true,
  continuous: true,
  showProgress: true,
  showSkipButton: true,
  disableOverlayClose: true,
};
