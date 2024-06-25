from flask import Flask, Response, render_template
import cv2
import mediapipe as mp
import math
import time
import numpy as np
from flask_socketio import SocketIO

app = Flask(__name__, template_folder='../templates', static_folder='../static')
# Initialize socket io
socketio = SocketIO(cors_allowed_origins=['http://127.0.0.1:5501'])

def send_noti_yes():
    socketio.emit('noti', 'yes')

def send_noti_no():
    socketio.emit('noti', 'no')

def gen_frames():
    cap = cv2.VideoCapture(0)


    mp_hands = mp.solutions.hands
    hands = mp_hands.Hands()
    mp_draw = mp.solutions.drawing_utils

    pTime = 0
    cTime = 0


    def dist(pos1, pos2):
        return math.sqrt((pos1[0] - pos2[0]) ** 2 + (pos1[1] - pos2[1]) ** 2) 
    
    def smooth_landmarks(landmarks, previous_landmarks, smoothing_factor=0.5):
        if previous_landmarks is None:
            return landmarks
        smoothed_landmarks = []
        for current, previous in zip(landmarks, previous_landmarks):
            smoothed_landmark = (1 - smoothing_factor) * np.array(previous) + smoothing_factor * np.array(current)
            smoothed_landmarks.append(smoothed_landmark)
        return smoothed_landmarks

    if (cap.isOpened() == False):
        print('error')

    while (True):

        success, img = cap.read()
        imgrgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

        if not success:
            break

        results = hands.process(img)

        four = None
        eight = None

        landmarks = smooth_landmarks(landmarks=results.multi_hand_landmarks, previous_landmarks=None)
        
        if results.multi_hand_landmarks:
            for handLM in landmarks:
                for id, lm in enumerate(handLM.landmark):
                    # print(id, lm)
                    h, w, c = img.shape
                    cx, cy = int(lm.x * w), int(lm.y * h)

                    if id == 4:
                        four = (cx, cy)
                    if id == 8:
                        eight = (cx, cy)
                

                # This should approximate only

                if dist(four, eight) <= 22:
                    # Send notification
                    send_noti_yes()
                else: send_noti_no()
                    
                mp_draw.draw_landmarks(img, handLM, mp_hands.HAND_CONNECTIONS)

        cTime = time.time()
        fps = 1/(cTime - pTime)
        pTime = cTime

        cv2.putText(img, str(int(fps)), (10, 70), cv2.FONT_HERSHEY_COMPLEX, 3, (255, 0, 255), 3)

                
        cv2.imshow('Image', img)
        _, buffer = cv2.imencode('.jpg', img)
        frame_data = buffer.tobytes()
        yield (b'--frame\r\n' b'Content-Type: image/jpeg\r\n\r\n' + frame_data + b'\r\n')


@app.route('/video')
def video():
    return Response(gen_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/')
def home():
    return render_template('index.html')

def main():
    socketio.init_app(app=app)
    app.run(debug=True, port=5501)


if __name__ == "__main__":
    main()
