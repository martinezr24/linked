import { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
} from "react-native";

// Helper to generate a unique ID without needing external libraries right now
const generateId = () =>
  Date.now().toString(36) + Math.random().toString(36).substring(2);

export default function App() {
  const [socket, setSocket] = useState(null);
  const [inputText, setInputText] = useState("");

  // The shared array state. Initialized with one item to test with.
  const [itinerary, setItinerary] = useState([
    { id: "item_init", text: "Flight arrives in CDMX" },
  ]);

  useEffect(() => {
    // 1. Connect to Go (Change localhost to your Mac's IP if using a physical phone)
    const ws = new WebSocket("ws://192.168.1.206:8080/ws");

    ws.onopen = () => console.log("Connected to Go Server!");

    // 2. Listen for incoming JSON payloads from the Go router
    ws.onmessage = (event) => {
      try {
        const { action, payload } = JSON.parse(event.data);

        switch (action) {
          case "ADD_ITEM":
            setItinerary((prev) => [...prev, payload]);
            break;
          case "DELETE_ITEM":
            setItinerary((prev) =>
              prev.filter((item) => item.id !== payload.id),
            );
            break;
          default:
            console.log("Unknown action:", action);
        }
      } catch (e) {
        console.log("Received non-JSON message:", event.data);
      }
    };

    setSocket(ws);
    return () => ws.close();
  }, []);

  // --- MUTATION FUNCTIONS ---

  const handleAddItem = () => {
    if (!inputText.trim() || !socket) return;

    const newItem = { id: generateId(), text: inputText };

    // 1. Optimistically update our local screen instantly
    setItinerary((prev) => [...prev, newItem]);
    setInputText(""); // Clear the input box

    // 2. Build the JSON contract and send it to the Go server
    const message = {
      action: "ADD_ITEM",
      payload: newItem,
    };
    socket.send(JSON.stringify(message));
  };

  const handleDeleteItem = (id) => {
    if (!socket) return;

    // 1. Instantly remove it from our local screen
    setItinerary((prev) => prev.filter((item) => item.id !== id));

    // 2. Tell the Go server to tell the partner to delete it
    const message = {
      action: "DELETE_ITEM",
      payload: { id: id },
    };
    socket.send(JSON.stringify(message));
  };

  // --- UI RENDERING ---

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>Trip Itinerary</Text>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Add a new plan..."
          onSubmitEditing={handleAddItem} // Triggers when you hit enter on the keyboard
        />
        <TouchableOpacity style={styles.addButton} onPress={handleAddItem}>
          <Text style={styles.addButtonText}>Add</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={itinerary}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.listItem}>
            <Text style={styles.itemText}>{item.text}</Text>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDeleteItem(item.id)}
            >
              <Text style={styles.deleteButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
        )}
        style={styles.list}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9f9f9", padding: 20 },
  header: { fontSize: 28, fontWeight: "800", marginBottom: 20, marginTop: 10 },
  inputContainer: { flexDirection: "row", marginBottom: 20 },
  input: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    marginRight: 10,
  },
  addButton: {
    backgroundColor: "#000",
    paddingHorizontal: 20,
    justifyContent: "center",
    borderRadius: 10,
  },
  addButtonText: { color: "#fff", fontWeight: "bold" },
  list: { flex: 1 },
  listItem: {
    flexDirection: "row",
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#eee",
  },
  itemText: { fontSize: 16, flex: 1 },
  deleteButton: { padding: 5 },
  deleteButtonText: { color: "#ff4444", fontWeight: "bold", fontSize: 18 },
});
