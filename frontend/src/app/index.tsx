import { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  Button,
  SafeAreaView,
  FlatList,
} from "react-native";

export default function App() {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [message, setMessage] = useState("");
  const [chatHistory, setChatHistory] = useState<string[]>([]);

  useEffect(() => {
    // 1. Open the connection to the Go server
    // Note: If testing on an Android emulator, change localhost to 10.0.2.2
    const ws = new WebSocket("ws://localhost:8080/ws");

    ws.onopen = () => {
      console.log("Connected to Linked Go Server!");
    };

    // 2. The Event Listener (receives the routed payload from Go)
    ws.onmessage = (event) => {
      setChatHistory((prev) => [...prev, `Partner: ${event.data}`]);
    };

    setSocket(ws);

    // 3. Cleanup: Close socket when app closes
    return () => {
      ws.close();
    };
  }, []);

  const sendMessage = () => {
    if (socket && message) {
      socket.send(message);
      // Optimistically update our own screen
      setChatHistory((prev) => [...prev, `Me: ${message}`]);
      setMessage("");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>Linked</Text>

      <FlatList
        data={chatHistory}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item }) => <Text style={styles.chatBubble}>{item}</Text>}
        style={styles.chatBox}
      />

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={message}
          onChangeText={setMessage}
          placeholder="Type a message..."
        />
        <Button title="Send" onPress={sendMessage} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5", padding: 20 },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginVertical: 10,
  },
  chatBox: { flex: 1, marginVertical: 20 },
  chatBubble: {
    padding: 10,
    backgroundColor: "#e0e0e0",
    marginVertical: 5,
    borderRadius: 8,
  },
  inputContainer: { flexDirection: "row", alignItems: "center" },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    borderRadius: 8,
    marginRight: 10,
  },
});
