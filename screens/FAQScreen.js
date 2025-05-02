import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Button,
} from "react-native";
import faqData from "../utils/faq"; // Import the FAQ data
import { useWindowDimensions } from 'react-native';


function FAQScreen() {
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const { width } = useWindowDimensions();


  const isMobile = width < 768; // Adjust the breakpoint as needed


  // Function to handle question press
  const handleQuestionPress = (faq) => {
    setSelectedQuestion(faq);
    setModalVisible(true);
  };

  return (
    <View style={[styles.container, isMobile && styles.containerMobile]}>
      <Text style={[styles.title, isMobile && styles.titleMobile]}>Frequently Asked Questions</Text>
      <View>
        {faqData.map((faq, index) => (
          <TouchableOpacity
            key={index}
            onPress={() => handleQuestionPress(faq)}
            style={styles.questionContainer}
          >
            <Text style={styles.questionText}>{faq.question}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalView}>
            {selectedQuestion && (
              <>
                <Text style={styles.modalTitle}>
                  {selectedQuestion.question}
                </Text>
                <Text style={styles.modalText}>{selectedQuestion.answer}</Text>
              </>
            )}
            <Button
              title="Close"
              onPress={() => setModalVisible(false)}
              color="#14489b"
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    padding: 40, // Default padding, can be overridden
  },
  containerMobile: {
    padding: 15, // Adjusted padding for mobile
  },
  title: {
    fontSize: 27,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'left',
    marginBottom: 20,
    marginTop: 10,
    marginLeft: 8,
  },
  titleMobile: {
    marginBottom: 20,
    marginTop: 10,
  },
  questionContainer: {
    backgroundColor: "#fff",
    padding: 15,
    marginBottom: 10,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  questionText: {
    fontSize: 16,
    color: "#333",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalView: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    width: "85%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#14489b",
    textAlign: "center",
  },
  modalText: {
    fontSize: 16,
    marginBottom: 15,
    color: "#555",
    textAlign: "center",
  },
});

export default FAQScreen;
