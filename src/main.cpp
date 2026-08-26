#include <Arduino.h>
#define LED_PIN 2
#define SENSOR_PIN A0
int threshold = 700;

void loop() {
    int value = analogRead(SENSOR_PIN);
    if (value > threshold) {
        digitalWrite(LED_PIN, HIGH);
        delay(100);
    } else {
        digitalWrite(LED_PIN, LOW);
    }
}
