import React, { useEffect, useState } from 'react';
import { Frame, Navigation, Box, Button, InlineStack, BlockStack, Text } from '@shopify/polaris';
import { HomeIcon, OrderIcon, ProductIcon, XIcon, ComposeIcon, ExitIcon } from '@shopify/polaris-icons';
import AppLogo from '@/components/Logo';
import { styled } from 'styled-components';
import { AnimatePresence, motion } from 'framer-motion';
import { usePathname, useSearchParams } from 'next/navigation';
import { Redirect } from '@shopify/app-bridge/actions';
import { useAppBridge } from '@/providers/AppBridgeProvider';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
}

function Sidebar({ isOpen, onToggle, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { app } = useAppBridge();
  const searchParams = useSearchParams();
  const host = searchParams?.get('host') || '';
  const shop = searchParams?.get('shop') || '';   
  const queryParams = new URLSearchParams({
    shop,
    host
  }).toString(); 

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const navigationItems = [
    {
      url: `/versions/light?${queryParams}`,
      label: 'Home',
      icon: HomeIcon,
      selected: pathname === '/versions/light',
      exactMatch: true
    },
    {
      url: `/versions/full?${queryParams}`,
      label: 'Full',
      icon: OrderIcon,
      selected: pathname === '/versions/full',
      exactMatch: true
    },
    {
      url: `/billing?${queryParams}`,
      label: 'Billing',
      icon: ProductIcon,
      selected: pathname === '/billing',
      exactMatch: true
    },
    {
      url: `/dashboard?${queryParams}`,
      label: 'Dashboard',
      icon: ProductIcon,
      selected: pathname === '/products',
      exactMatch: true
    },
    {
      url: `/content?${queryParams}`,
      label: 'History',
      icon: ProductIcon,
      selected: pathname === '/content',
      exactMatch: true
    },
  ];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <Frame>
        <InlineStack blockAlign="start" gap="10">
          <Box 
            background="bg-fill-disabled"
            paddingBlock="400"
            minHeight="100vh"
            width="30px"
            position="relative"
            paddingBlockStart="500"
          />
          <Box
            background="bg-surface"
            minHeight="100vh"
            width="240px"
            position="relative"
            paddingBlockStart="500"
          >
            <BlockStack gap="600" align="space-between">
              <Box paddingInline="200">
                <InlineStack align="space-between">
                  <Button 
                    icon={XIcon} 
                    onClick={onClose}
                    variant="tertiary"
                    accessibilityLabel="Close sidebar"
                  />
                  <Button 
                    icon={ComposeIcon} 
                    onClick={onToggle}
                    variant="tertiary"
                    accessibilityLabel="Toggle compose"
                  />
                </InlineStack>
              </Box>
              <InlineStack gap="200" align="center" blockAlign="center">
                <AppLogo width={40} height={40} />
                <Text variant="headingXl" as="span">OptiWrite</Text>
              </InlineStack>
            </BlockStack>
            <Box paddingBlockEnd="400" />
            <Box>
              <Navigation location={pathname}>
                <Navigation.Section
                  items={navigationItems.map(item => ({
                    label: item.label,
                    icon: item.icon,
                    url: item.url,
                    selected: item.selected,
                    onClick: (event) => {
                      window.open(item.url, "_top");
                      /*app.dispatch(Redirect.Action.APP, {
                        path: item.url,
                      });*/
                      if (isMobile) {
                        onClose();
                      }
                    },
                    matches: item.selected,
                    exactMatch: item.exactMatch,
                  }))}
                />
              </Navigation>
            </Box>
            <Box className="w-full fixed bottom-6 pr-12 pl-2">
              <InlineStack align="space-between" blockAlign="center">
                <img 
                  className="rounded-full" 
                  src={"data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAkGBxIHDQ4PDw0QEA8QEA8RDxAODRIODQ8PGBEXFhURFRUYHSggGBolGxcVITEhJSkrLi4uFx8zOTMsNygtLisBCgoKDQ0NDg0NDisZHxkrKysrKysrKysrKysrKysrKysrKysrKysrKysrKysrKysrKysrKysrKysrKysrKysrKysrK//AABEIAOEA4QMBIgACEQEDEQH/xAAaAAEAAwEBAQAAAAAAAAAAAAAAAQQFAwIH/8QAMhABAAIABAMFBwMFAQAAAAAAAAECAwQRMSFRcRITQWGBBSIykaGxwUJi0TNScuHwFP/EABUBAQEAAAAAAAAAAAAAAAAAAAAB/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8A+qAKgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACNgSK+JnK0249Nvm4Wz8+FY9Z1BfGd/7bft+X+01z0+NYnprANAVcPO1tvrX6ws1mLRrE6x5cQSAAAAAAAAAAAAAAAAAAAAADnjYsYUaz6R4yzcbHnG325RsnNYve3nlHCHIABQAAdMDE7q0TrOnjp4uYDYpbtxE7T4cGd7PnWs8I9N56raAAAAAAAAAAAAAAAAAAAAr5rH7mOHxTt5eawyc1id5eZ9I6A5gKAAAAAAAu5DGj4NPOJ5rrGrPZmJjeOLXpbtxE84iUHoAAAAAAAAAAAAAAAAAHjFt2K2nlEshp5ydMO3p92YAAoAAAAAANPJW1w48tY+rMaHs+fcn/L8QgtAAAAAAAAAAAAAAAAA8YtuxW08onTqDjn59zTzhnE8RQAAAAAgAABd9nTwtHnCkA2hxyl+3SJnfjDsgAAAAAAAAAAAAAAPGNXt1tHOJ+z2AxJQu5rKzrNqxrE7x4xKoo8j0A8j0AjdD0A8j0A8pidUrGWys30mY0rv1Bcylezh1+f1dkJQAAAAAAAAAAAAAAAARbaejGbFo1iekseY04AAKAAAAAADVys64dejKa2DTu61jlCDoAAAAAAAAAAAAAAAAAAycxHZvbrLWZ2fppfXwmI+YKwCgAAAAACax2piOcxDZZuSw5veJ8K7/hpIAAAAAAAAAAAAAAAAAADnmMPvaTHj4dXQBjWr2ZmJ3hDSzGVjGnXXSdPmzr0mkzE7wCAFAAAiNSOLQyuV7vS1t+XhAOmVwu6rpO8zrLsCAAAAAAAAAAAAAAAAACJtEbzEdZBI5TmK1/XHpOv2c7Z2sc56R/ILLJzM63t1lYtn+VfnKpae1Mzz4ggBQABNZ0mJ84bLFW6Z6Y3rE9J0QXxWrnazvrHo6VzFLfqj14A6jzFottMT0l6AAAAAAAAAAABwzWP3Mfunb+Qe8XGjC3n08ZU8TO2t8MRH1lWtabTrM6ygHq2Ja+9pn1eQUAAAAAAAAAAAAHqt5rtMx0l5AWMPOWrv73XhPzXMHMVxtt+U7ssidEG0KuUzHee7PxfdaAAAAAABFrdmJmdo4sjFvOJaZnxXs/fs00/un6R/0M8ABQAAAAAAAAAAAAAAAAABNZ7M6xvDWwr95WJ5/dkLvs6/xV9Y/P4QXQAAAAAUPaPxV6flUAABQAAAAAAAAAAAAAAAAAAd8j/UjpP2SA0gEAAH/9k="} 
                  width="30" 
                  alt="Profile Icon" 
                />
                <Button icon={ExitIcon} variant="tertiary" />
              </InlineStack>
            </Box>
          </Box>
        </InlineStack>
      </Frame>
    </AnimatePresence>
  );
}

export default Sidebar;