#include <Arduino.h>
#define LED_PIN 2
#define SENSOR_PIN A0
int threshold = 600;

void loop() {
    int value = analogRead(SENSOR_PIN);
    if (value > threshold)
        digitalWrite(LED_PIN, HIGH);
    else
        digitalWrite(LED_PIN, LOW);
}
