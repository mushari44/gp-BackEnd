from flask import Flask, request, jsonify
import openai
import os
from dotenv import load_dotenv
#from openai import OpenAI
from custom_data import custom_data
load_dotenv()  # Load the environment variables
openai.api_key = os.getenv("OPENAI_API_KEY")
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # This will enable CORS for all routes

# Debugging home route
print("Starting Flask app...")

@app.route('/', methods=['GET'])
def home():
    print("Debug: Home route was called!")
    return "Flask is running!"

@app.route('/api/chatbot', methods=['POST'])
def chatbot():
    print("Debug: Chatbot route was called!")
    data = request.json
    user_message = data.get("query", "")
    custom_data1 = custom_data
    print("Debug: OpenAI API call")
    try:
        print("Updated custom_data being sent to OpenAI:")
        print(custom_data1)
        # Make the OpenAI API call
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a university advising chatbot. "
                        "Use the provided information strictly to answer the user's question. "
                        "Prioritize accuracy and only respond based on the given details."
                    ),
                },
                {"role": "assistant", "content": custom_data1},
                {"role": "user", "content": user_message},
            ],
            max_tokens=2000,
        )

        # Extract the reply
        reply = response.choices[0].message.content
        print(f"Chatbot Reply: {reply}")
        return jsonify({"reply": reply})
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
 print("Starting Flask server...")
 app.run(debug=True)