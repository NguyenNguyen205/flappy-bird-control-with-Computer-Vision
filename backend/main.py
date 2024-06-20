import cv2
import mediapipe as mp
import math
import time

def main():
    cap = cv2.VideoCapture(0)


    mp_hands = mp.solutions.hands
    hands = mp_hands.Hands()
    mp_draw = mp.solutions.drawing_utils

    pTime = 0
    cTime = 0


    def dist(pos1, pos2):
        return math.sqrt((pos1[0] - pos2[0]) ** 2 + (pos1[1] - pos2[1]) ** 2) 

    if (cap.isOpened() == False):
        print('error')

    while (cap.isOpened()):

        success, img = cap.read()
        imgrgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

        if not success:
            break

        results = hands.process(img)

        four = None
        eight = None


        
        if results.multi_hand_landmarks:
            for handLM in results.multi_hand_landmarks:
                for id, lm in enumerate(handLM.landmark):
                    # print(id, lm)
                    h, w, c = img.shape
                    cx, cy = int(lm.x * w), int(lm.y * h)
                    print(id,cx, cy)

                    if id == 4:
                        four = (cx, cy)
                    if id == 8:
                        eight = (cx, cy)

                # This should approximate only
                if dist(four, eight) <= 20:
                    print('yes')

                    
                mp_draw.draw_landmarks(img, handLM, mp_hands.HAND_CONNECTIONS)

        cTime = time.time()
        fps = 1/(cTime - pTime)
        pTime = cTime

        cv2.putText(img, str(int(fps)), (10, 70), cv2.FONT_HERSHEY_COMPLEX, 3, (255, 0, 255), 3)

                
        cv2.imshow('Image', img)


        # Break out of 
        if cv2.waitKey(25) & 0xFF == ord('q'):
                break

    cap.release()

    cv2.destroyAllWindows()


if __name__ == "__main__":
    main()