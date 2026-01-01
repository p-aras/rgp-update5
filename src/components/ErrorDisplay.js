import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiAlertTriangle } from 'react-icons/fi';

const ErrorDisplay = ({ error }) => {
  return (
    <AnimatePresence>
      {error && (
        <motion.div
          className="ErrorCard"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
        >
          <FiAlertTriangle />
          <span>{error}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ErrorDisplay;