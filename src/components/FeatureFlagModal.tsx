import { Modal, TextContainer, Banner } from '@shopify/polaris';
import { FeatureFlag } from '@prisma/client';

interface FeatureFlagModalProps {
  featureFlag: FeatureFlag;
  onClose: () => void;
}

const FeatureFlagModal = ({ featureFlag, onClose }: FeatureFlagModalProps) => {
  return (
    <Modal
      open={true}
      onClose={onClose}
      title="New Feature Available"
      primaryAction={{
        content: 'Got it',
        onAction: onClose,
      }}
    >
      <Modal.Section>
        <Banner
          title={featureFlag.name}
          status={featureFlag.isEnabled ? "success" : "info"}
        />
        <TextContainer>
          <p>{featureFlag.description}</p>
          <div style={{ marginTop: '16px' }}>
            <p>Status: {featureFlag.isEnabled ? 'Enabled' : 'Disabled'}</p>
            {featureFlag.percentage < 100 && (
              <p>Rollout: {featureFlag.percentage}% of users</p>
            )}
          </div>
        </TextContainer>
      </Modal.Section>
    </Modal>
  );
};

export default FeatureFlagModal;