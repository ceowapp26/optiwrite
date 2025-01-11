import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from "framer-motion";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button } from "@nextui-org/react";

const EditProductModal = ({ isOpen, onClose, onOpenChange }) => {
  const router = useRouter();
  const [shopName, setShopName] = useState('');

  const handleSubmit = () => {
    if (shopName) {
      router.push(`/api/auth/shopify?shop=${shopName}`);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <Modal
          onOpenChange={onOpenChange}
          isOpen={isOpen}
          onClose={onClose}
          size="4xl"
          scrollBehavior="inside"
          backdrop="blur"
          motionProps={{
            variants: {
              enter: {
                y: 0,
                opacity: 1,
                scale: 1,
                transition: {
                  duration: 0.5,
                  ease: [0.22, 1, 0.36, 1],
                },
              },
              exit: {
                y: -20,
                opacity: 0,
                scale: 0.95,
                transition: {
                  duration: 0.3,
                  ease: [0.22, 1, 0.36, 1],
                },
              },
            }
          }}
          classNames={{
            wrapper: 'z-[99999] pt-8',
            backdrop: "bg-gradient-to-t from-zinc-900 to-zinc-900/10 backdrop-opacity-20",
            base: 'bg-gradient-to-br from-blue-200 to-green-300 rounded-2xl shadow-2xl',
            closeButton: 'hover:bg-white/5 active:bg-white/10',
          }}
        >
          <ModalContent>
            {(onClose) => (
              <>
                <ModalHeader className="flex flex-col gap-1">
                  <motion.h3
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="text-3xl font-bold text-zinc-800"
                  >
                    Your shop is not installed our app yet!!!
                  </motion.h3>
                </ModalHeader>
                <FormProvider>
                  <ModalBody>
                    <Input
                      clearable
                      bordered
                      fullWidth
                      size="lg"
                      placeholder="Enter your Shopify store name"
                      value={shopName}
                      onChange={(e) => setShopName(e.target.value)}
                    />
                  </ModalBody>
                  <ModalFooter className="flex w-full justify-between">
                    <Button auto flat color="error" onClick={handleClose}>
                      Cancel
                    </Button>
                    <Button auto onClick={handleSubmit}>
                      Authenticate
                    </Button>
                  </ModalFooter>
                </FormProvider>
              </>
            )}
          </ModalContent>
        </Modal>
      )}
    </AnimatePresence>
  );
};

export default ShopifyAuthModal;
