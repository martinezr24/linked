import { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
} from "react-native";

export default function App() {
  const [socket, setSocket] = useState(null);

  // This is the shared state. It starts as white.
  const [backgroundColor, setBackgroundColor] = useState("#FFFFFF");

  useEffect(() => {
    // 1. Connect to Go (Remember to use your Mac's IP if on a physical phone)
    const ws = new WebSocket("ws://localhost:8080/ws");

    ws.onopen = () => console.log("Connected to Linked Go Server!");

    // 2. The JSON Listener
    ws.onmessage = (event) => {
      try {
        // Parse the incoming string back into a JSON object
        const data = JSON.parse(event.data);

        // Route the event based on its "type"
        if (data.type === "color_change") {
          console.log("Partner changed the color to:", data.color);
          setBackgroundColor(data.color); // Instantly update UI
        }
      } catch (e) {
        console.log("Received non-JSON message:", event.data);
      }
    };

    setSocket(ws);
    return () => ws.close();
  }, []);

  // 3. The JSON Sender
  const handleColorTap = (hexColor) => {
    // Optimistically update our own screen instantly
    setBackgroundColor(hexColor);

    // Build the JSON contract and send it to Go
    if (socket) {
      const payload = {
        type: "color_change",
        color: hexColor,
      };
      // WebSockets only send text/bytes, so we stringify the object
      socket.send(JSON.stringify(payload));
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]}>
      <Text style={styles.header}>Linked: Shared State</Text>

      <View style={styles.buttonContainer}>
        {/* The Action Buttons */}
        <ColorButton
          color="#FF5733"
          title="Red"
          onPress={() => handleColorTap("#FF5733")}
        />
        <ColorButton
          color="#33FF57"
          title="Green"
          onPress={() => handleColorTap("#33FF57")}
        />
        <ColorButton
          color="#3357FF"
          title="Blue"
          onPress={() => handleColorTap("#3357FF")}
        />
        <ColorButton
          color="#FFFFFF"
          title="Reset"
          onPress={() => handleColorTap("#FFFFFF")}
        />
      </View>
    </SafeAreaView>
  );
}

// A simple reusable button component
const ColorButton = ({ color, title, onPress }) => (
  <TouchableOpacity
    style={[styles.button, { backgroundColor: color }]}
    onPress={onPress}
  >
    <Text style={styles.buttonText}>{title}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    transition: "background-color 0.2s",
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 50,
  },
  buttonContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 20,
  },
  button: {
    padding: 20,
    borderRadius: 50,
    width: 100,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  buttonText: {
    fontWeight: "bold",
    color: "#000",
    textShadowColor: "#FFF",
    textShadowRadius: 2,
  },
});
