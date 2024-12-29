from flask import Flask, request, jsonify
import openai
import os
from dotenv import load_dotenv
from flask_cors import CORS

# Initialize Flask app
app = Flask(__name__)

# Enable CORS with specific configuration
CORS(app, resources={r"/api/*": {"origins": "*"}})  # Adjust origins for production

# Load environment variables
load_dotenv()

# Get OpenAI API key from environment variables
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise ValueError("OpenAI API key is not set. Please define OPENAI_API_KEY in your .env file.")

openai.api_key = OPENAI_API_KEY

@app.route('/', methods=['GET'])
def home():
    """Basic home endpoint."""
    return "Flask is running!"

# @app.route('/test', methods=['GET'])
# def test_chatbot():
#     """A test endpoint to display a simple HTML form for testing the chatbot."""
#     return '''
#     <!DOCTYPE html>
#     <html>
#     <head>
#         <title>Chatbot Test</title>
#     </head>
#     <body>
#         <h1>University Advising Chatbot</h1>
#         <form action="/api/chatbot" method="post">
#             <label for="message">Enter your question:</label><br>
#             <input type="text" id="message" name="message" required><br><br>
#             <button type="submit">Send</button>
#         </form>
#     </body>
#     </html>
#     '''

@app.route('/api/chatbot', methods=['POST'])
def chatbot():
    """API endpoint to interact with the OpenAI-powered chatbot."""
    try:
        # Validate request data
        data = request.get_json()
        if not data or "message" not in data:
            return jsonify({"error": "Invalid request. 'message' is required."}), 400

        user_message = data["message"]

        # Custom data for the chatbot
        custom_data = """
        You are a chatbot for our university advising system. Use this information:

        - Advisors:
        - Dr. Mostafa Ibrahim:
            - Office Hours: Sunday to Wednesday, 10 AM to 2 PM
            - Office Location: Building 5, Room 213
            - TEACHES Computer Architecture CS228, Logic Design CS120, and Discrete Structures CS114
            
        - Dr. Mohammed Aljammaz:
            - Office Hours: Monday and Thursday, 12:20 PM to 2 PM
            - Office Location: Building 3, Room 230
            - TEACHES Software Security CS442 and Computer Networks CS330

        - Students:
        - Abdullah Alhagbani:
            - Soon-to-be graduate in Computer Science
            - Contact: Riyadh, Saudi Arabia | +966(54-232-1333) | Abdullah.Alhagbani10@gmail.com
            - GPA: 4.17
            - Skills: Proficient in C++, SQL, JavaScript; Database management; Frontend development
            - Achievements: Led Enjaz Club, developed projects like CCIS Guide Map
            - Certifications: eJPT V2, Data Analysis Basics, Competitive Programming Training

        - Mushari Alothman:
            - Computer Science student with experience in Web development
            - Contact: Riyadh, Saudi Arabia | 0567614044 | musharialothman44@gmail.com
            - Skills: Client-side (JavaScript, React, Python); Server-side (MongoDB, Express.js)
            - Achievements: Ranked 7th on "CoderHub," 3rd place in IMSIU programming hackathon
            - Projects: Academic Advising System (Graduation project), Full-stack online store
        """

        # OpenAI API call
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": (
                    "You are a university advising chatbot. "
                    "Use the provided information strictly to answer the user's question. "
                    "Prioritize accuracy and only respond based on the given details."
                )},
                {"role": "assistant", "content": custom_data},
                {"role": "user", "content": user_message},
            ],
            max_tokens=500,
        )

        # Extract the chatbot's reply
        reply = response.choices[0].message.content
        return jsonify({"reply": reply})

    except openai.error.OpenAIError as e:
        return jsonify({"error": f"OpenAI API error: {str(e)}"}), 500
    except Exception as e:
        return jsonify({"error": f"An unexpected error occurred: {str(e)}"}), 500

if __name__ == "__main__":
    print("Starting Flask server...")
    app.run(host="0.0.0.0", port=8000)
