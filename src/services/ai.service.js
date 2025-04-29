const axios = require('axios');
const config = require('../config/config');
const { AppError } = require('../middleware/error.middleware');
const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({ apiKey: config.GEMINI_API_KEY });


// Base API URL for Gemini API
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const GEMINI_MODEL = 'gemini-pro';
const GEMINI_VISION_MODEL = 'gemini-pro-vision';

// Configure axios for Gemini API
const geminiApi = axios.create({
    baseURL: GEMINI_API_URL,
    params: {
        key: config.GEMINI_API_KEY
    }
});

// Helper to format message for text-only prompt
const formatTextPrompt = (messages) => {
    return messages.map(msg => ({
        role: msg.role === 'ai' ? 'model' : 'user',
        parts: [{ text: msg.message }]
    }));
};

// Helper to format message for vision prompt (with images)
const formatVisionPrompt = (messages, imageUrls) => {
    const lastMessage = messages[messages.length - 1];

    // Format images for Gemini API
    const imageParts = imageUrls.map(imageUrl => ({
        inlineData: {
            data: imageUrl,
            mimeType: 'image/jpeg' // Adjust based on actual image type
        }
    }));

    // Combine text and images for the last message
    const parts = [
        { text: lastMessage.message },
        ...imageParts
    ];

    // Create formatted content
    return [
        {
            role: 'user',
            parts
        }
    ];
};

// Text-only completion
exports.generateTextCompletion = async (messages, options = {}) => {
    try {

        // remove the last message and store in variable
        const lastMessage = messages.pop();
        const formattedMessages = formatTextPrompt(messages);

        const chat = ai.chats.create({
            model: "gemini-1.5-pro",
            history: formattedMessages,
        });

        const response = await chat.sendMessage({
            message: lastMessage.message,
        });

        if (!response || !response.text) {
            throw new AppError('No response generated from AI', 500);
        }

        const generatedText = response.text;
        return generatedText;
    } catch (error) {
        console.error('AI text completion error:', error.response?.data || error.message);
        throw new AppError('Failed to generate AI response', 500);
    }
};

exports.getAIResponse = async (prompt, options = {}) => {
    try {

        const response = await ai.models.generateContent({
            model: "gemini-2.0-flash",
            contents: prompt,
        });

        if (!response || !response.text) {
            throw new AppError('No response generated from AI', 500);
        }

        const generatedText = response.text;
        return generatedText;
    } catch (error) {
        console.error('AI text completion error:', error.response?.data || error.message);
        throw new AppError('Failed to generate AI response', 500);
    }
};

// Vision API completion (with images)
exports.generateVisionCompletion = async (message, imageUrls, options = {}) => {
    try {
        // Create messages array with the single message
        const messages = [{ role: 'user', message }];

        const formattedContent = formatVisionPrompt(messages, imageUrls);

        const response = await geminiApi.post(`/${GEMINI_VISION_MODEL}:generateContent`, {
            contents: formattedContent,
            generationConfig: {
                temperature: options.temperature || 0.7,
                topP: options.topP || 0.9,
                topK: options.topK || 40,
                maxOutputTokens: options.maxTokens || 4096
            }
        });

        if (!response.data.candidates || response.data.candidates.length === 0) {
            throw new AppError('No response generated from AI', 500);
        }

        const generatedText = response.data.candidates[0].content.parts[0].text;
        return generatedText;
    } catch (error) {
        console.error('AI vision completion error:', error.response?.data || error.message);
        throw new AppError('Failed to generate AI response for image', 500);
    }
};

// AI Medical diagnosis
exports.medicalDiagnosis = async (patientMessage, patientHistory = null) => {
    try {
        // Construct prompt with medical context
        let prompt = `
You are a Medical Diagnosis Assistant Chatbot. Your goal is to diagnose patients by asking relevant and detailed questions about their symptoms, one question at a time.

You will be provided with the chat history so based on that you have to keep asking the questions to the patient until the whole diagnosis is completed.

Follow these steps in sequence (asking only one question per response):
1. First, greet the patient and only ask for their personal details name, age, gender, occupation and address(city, state).
2. Next, only inquire about the main symptom they are experiencing.
3. Based on the reported symptom, ask specific follow-up questions one at a time.
4. When appropriate, assess pain intensity (rating pain from 1 to 10).
5. In a separate question, ask about pain type (e.g., throbbing, sharp) if applicable.
6. In another response, ask about any medication (symptom related or not) and if medication related to symptom, taken what effects did it have was it hepful or not.
8. In a new response, determine the duration of the symptoms and weather they are progressive increasing or supressive.
9. In another response, ask what they might speculate the cause of the symptoms to be or they have had the experienced similar conditions before.
10. Ask If they have undergone any surgeries in the past or have any chronic diseases like blood pressure, diabetes, chloestrol etc.
11. Then ask about their family history of any chronic diseases and if they had done any blood transfusion recently.
12. Finally, ask for any additional relevant information they would like to share.
13. When all necessary information is gathered, diagnosis will be completed.

You must act according to the chat history and ask only the next suitable single question based on the conversation.

You have to give response in the json format with two things:

First is the message which is acknowledgement to the last user's answer and your next single question you want to ask to the patient.

Second is the status of chat which should be "ongoing" or "completed".
When the current question is the last question you think should be asked, then you have to give the status as "completed" otherwise "ongoing".

Strictly make sure to ask only one question at a time.

sample response:

{
    "message": "Thank you. What is the level of pain you are experiencing on a scale of 1 to 10?",
    "status": "ongoing"
}

{
    "message": "Thank you for sharing all the details. I have noted down your symptoms and will get back to you soon.",
    "status": "completed"
}

strictly make sure you have to only return json in the output nothing except it. no any explanation other than json
`

        if (patientHistory) {
            prompt += `\n\nPatient medical history: ${patientHistory}`;
        }

        prompt += '\n\nBased on this information, what follow-up questions should be asked to better understand the condition? Please provide a professional medical assessment.';

        const messages = [
            { role: 'user', message: prompt }
        ];

        let responseText = await this.generateTextCompletion(messages, { temperature: 0 });
        responseText = responseText.replace("```json", '');
        responseText = responseText.replace("```", '');

        let responseJson = JSON.parse(responseText);

        let message = responseJson.message || '';
        let status = responseJson.status || 'ongoing';

        return {
            message,
            status
        }

    } catch (error) {
        console.error('Medical diagnosis error:', error);
        throw new AppError('Failed to generate medical diagnosis', 500);
    }
};

// AI diagnosis summary
exports.generateDiagnosisSummary = async (conversationHistory, patientHistory = null) => {
    try {
        // Construct prompt for summary
        let prompt = 'Based on the following conversation, provide a detailed medical summary of the patient\'s condition, likely diagnosis, and recommended next steps.\n\n';

        // Add conversation history
        prompt += 'Conversation:\n';
        conversationHistory.forEach(message => {
            const role = message.role === 'ai' ? 'AI Assistant' : 'Patient';
            prompt += `${role}: ${message.message}\n`;
        });

        if (patientHistory) {
            prompt += `\nPatient medical history: ${patientHistory}`;
        }

        prompt += '\n\nPlease provide a structured summary with sections for: Primary Symptoms, Possible Diagnosis, Recommended Tests, and Suggested Specialist.';

        const aiResponse = await this.getAIResponse(prompt, { temperature: 0.3 });

        return aiResponse
    } catch (error) {
        console.error('Diagnosis summary error:', error);
        throw new AppError('Failed to generate diagnosis summary', 500);
    }
};

// AI suggest medical tests
exports.suggestMedicalTests = async (diagnosisSummary, patientHistory = null) => {
    try {
        // Construct prompt for test suggestions
        let prompt = 'Based on the following diagnosis summary, suggest appropriate medical tests that should be conducted. For each test, provide a brief explanation of why it\'s necessary.\n\n';

        prompt += `Diagnosis summary: ${diagnosisSummary}`;

        if (patientHistory) {
            prompt += `\n\nPatient medical history: ${patientHistory}`;
        }

        prompt += '\n\nPlease format your response as a structured list with each test having a name, reason, and priority (high/medium/low).';

        const messages = [
            { role: 'user', message: prompt }
        ];

        const response = await this.generateTextCompletion(messages, { temperature: 0.3 });

        // Parse the response to extract structured test information
        // This is a simplified approach - in a real system, you'd want more robust parsing
        const tests = [];
        const testRegex = /\*\*([^*]+)\*\*|^(\d+\.)\s+([^:]+):|^- ([^:]+):/gm;

        let match;
        let currentTest = null;

        console.log(response)
        const lines = response.split('\n');

        for (const line of lines) {
            // Check if line is a test name
            if (line.match(testRegex)) {
                // Save previous test if it exists
                if (currentTest) {
                    tests.push(currentTest);
                }

                // Extract test name
                const testName = line.replace(testRegex, '$1$3$4').trim();

                currentTest = {
                    name: testName,
                    reason: '',
                    priority: 'medium' // Default priority
                };
            }
            // Check if line contains test reason
            else if (line.includes('Reason:') || line.includes('reason:')) {
                if (currentTest) {
                    currentTest.reason = line.split(':')[1].trim();
                }
            }
            // Check if line contains priority
            else if (line.includes('Priority:') || line.includes('priority:')) {
                if (currentTest) {
                    const priorityText = line.split(':')[1].trim();
                    if (priorityText.toLowerCase().includes('high')) {
                        currentTest.priority = 'high';
                    } else if (priorityText.toLowerCase().includes('medium')) {
                        currentTest.priority = 'medium';
                    } else if (priorityText.toLowerCase().includes('low')) {
                        currentTest.priority = 'low';
                    }
                }
            }
        }

        // Add the last test if it exists
        if (currentTest) {
            tests.push(currentTest);
        }

        return {
            rawResponse: response,
            tests
        };
    } catch (error) {
        console.error('Test suggestion error:', error);
        throw new AppError('Failed to suggest medical tests', 500);
    }
};

// AI recommend doctor
exports.recommendDoctor = async (diagnosisSummary, doctorsList) => {
    try {
        // Construct prompt for doctor recommendation
        let prompt = 'Based on the following diagnosis summary, recommend the most appropriate medical specialist from the provided list. Provide a brief explanation for your recommendation.\n\n';

        prompt += `Diagnosis summary: ${diagnosisSummary}\n\n`;

        prompt += 'Available doctors:\n';
        doctorsList.forEach(doctor => {
            prompt += `- Dr. ${doctor.name.first} ${doctor.name.last}, Specialization: ${doctor.specialization}, Experience: ${doctor.experience} years\n`;
        });

        prompt += '\n\nPlease recommend one doctor and explain why they are the best match for this case.';

        const messages = [
            { role: 'user', message: prompt }
        ];

        const response = await this.generateTextCompletion(messages, { temperature: 0.3 });

        // Parse response to extract recommended doctor
        // This is a simplified approach
        let recommendedDoctorId = null;
        let reason = '';

        doctorsList.forEach(doctor => {
            const doctorName = `Dr. ${doctor.name.first} ${doctor.name.last}`;
            if (response.includes(doctorName)) {
                recommendedDoctorId = doctor._id;

                // Attempt to extract reason
                const nameIndex = response.indexOf(doctorName);
                if (nameIndex !== -1) {
                    reason = response.substring(nameIndex);
                }
            }
        });

        return {
            rawResponse: response,
            recommendedDoctorId,
            reason
        };
    } catch (error) {
        console.error('Doctor recommendation error:', error);
        throw new AppError('Failed to recommend doctor', 500);
    }
};

// AI analyze medical report
exports.analyzeMedicalReport = async (reportType, reportText, diagnosisSummary = null) => {
    try {
        // Construct prompt for report analysis
        let prompt = `Please analyze the following ${reportType} medical report and provide a concise summary of the findings, highlighting any abnormal values or areas of concern.\n\n`;

        prompt += `Report content: ${reportText}\n\n`;

        if (diagnosisSummary) {
            prompt += `Patient diagnosis: ${diagnosisSummary}\n\n`;
        }

        prompt += 'Please structure your response with sections for: Summary, Key Findings, Abnormal Values, and Recommendations for the doctor.';

        const messages = [
            { role: 'user', message: prompt }
        ];

        return await this.generateTextCompletion(messages, { temperature: 0.3 });
    } catch (error) {
        console.error('Report analysis error:', error);
        throw new AppError('Failed to analyze medical report', 500);
    }
};

// AI parse prescription
exports.parsePrescription = async (prescriptionText) => {
    try {
        // Construct prompt for prescription parsing
        const prompt = `Parse the following medical prescription into a structured format. For each medication, extract the name, dosage, frequency, duration, and special instructions if available.\n\n${prescriptionText}\n\nPlease format your response as a JSON object with an array of medications.`;

        const messages = [
            { role: 'user', message: prompt }
        ];

        const response = await this.generateTextCompletion(messages, { temperature: 0.3 });

        // Attempt to extract JSON from response
        try {
            // Find JSON-like structure in the response
            const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/) ||
                response.match(/```\n([\s\S]*?)\n```/) ||
                response.match(/\{[\s\S]*\}/);

            let jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : response;

            // Clean up the JSON string
            jsonStr = jsonStr.replace(/```/g, '').trim();

            // Parse JSON
            const result = JSON.parse(jsonStr);

            return {
                rawResponse: response,
                medications: result.medications || result
            };
        } catch (jsonError) {
            console.error('Error parsing JSON from AI response:', jsonError);

            // Fallback: manual parsing
            const medications = [];
            const lines = response.split('\n');

            let currentMed = null;

            for (const line of lines) {
                // Check if line contains medication name
                if (line.match(/^\d+\.\s+/) || line.match(/^Medication\s+\d+:/i) || line.match(/^- [A-Za-z]/)) {
                    // Save previous medication if it exists
                    if (currentMed) {
                        medications.push(currentMed);
                    }

                    // Extract medication name
                    const medName = line.replace(/^\d+\.\s+|^Medication\s+\d+:\s+|^- /i, '').split(':')[0].trim();

                    currentMed = {
                        name: medName,
                        dosage: '',
                        frequency: '',
                        startDate: new Date(),
                        endDate: null,
                        instructions: ''
                    };
                }
                // Check for dosage information
                else if (line.includes('Dosage:') || line.includes('dosage:')) {
                    if (currentMed) {
                        currentMed.dosage = line.split(':')[1].trim();
                    }
                }
                // Check for frequency information
                else if (line.includes('Frequency:') || line.includes('frequency:') || line.includes('Take:')) {
                    if (currentMed) {
                        currentMed.frequency = line.split(':')[1].trim();
                    }
                }
                // Check for duration/timing information
                else if (line.includes('Duration:') || line.includes('duration:') || line.includes('For:')) {
                    if (currentMed) {
                        // Parse duration information (simplified)
                        const durationText = line.split(':')[1].trim();
                        currentMed.instructions += `Duration: ${durationText}. `;

                        // Set end date based on duration (simplified implementation)
                        if (durationText.includes('day') || durationText.includes('week') || durationText.includes('month')) {
                            const endDate = new Date();
                            if (durationText.includes('day')) {
                                const days = parseInt(durationText.match(/\d+/)[0]);
                                endDate.setDate(endDate.getDate() + days);
                            } else if (durationText.includes('week')) {
                                const weeks = parseInt(durationText.match(/\d+/)[0]);
                                endDate.setDate(endDate.getDate() + (weeks * 7));
                            } else if (durationText.includes('month')) {
                                const months = parseInt(durationText.match(/\d+/)[0]);
                                endDate.setMonth(endDate.getMonth() + months);
                            }
                            currentMed.endDate = endDate;
                        }
                    }
                }
                // Check for instructions
                else if (line.includes('Instructions:') || line.includes('instructions:') || line.includes('Note:')) {
                    if (currentMed) {
                        currentMed.instructions += line.split(':')[1].trim();
                    }
                }
            }

            // Add the last medication if it exists
            if (currentMed) {
                medications.push(currentMed);
            }

            return {
                rawResponse: response,
                medications
            };
        }
    } catch (error) {
        console.error('Prescription parsing error:', error);
        throw new AppError('Failed to parse prescription', 500);
    }
};

// AI analyze health metrics
exports.analyzeHealthMetrics = async (metricType, value, patientHistory, previousReadings = []) => {
    try {
        // Construct prompt for health metric analysis
        let prompt = `Analyze the following health metric reading for a patient:\n\nMetric: ${metricType}\nCurrent Value: ${value}\n`;

        if (previousReadings.length > 0) {
            prompt += '\nPrevious readings:\n';
            previousReadings.forEach((reading, index) => {
                prompt += `${index + 1}. ${reading.value} (${new Date(reading.timestamp).toLocaleDateString()})\n`;
            });
        }

        if (patientHistory) {
            prompt += `\nPatient history: ${patientHistory}\n`;
        }

        prompt += '\nPlease determine if this reading is normal or abnormal, and provide a brief analysis. If abnormal, suggest a severity level (mild, moderate, severe) and potential actions to take.';

        const messages = [
            { role: 'user', message: prompt }
        ];

        const response = await this.generateTextCompletion(messages, { temperature: 0.3 });

        // Parse the response to extract structured information
        const isAbnormal = response.toLowerCase().includes('abnormal');

        let severity = null;
        if (isAbnormal) {
            if (response.toLowerCase().includes('severe')) {
                severity = 'severe';
            } else if (response.toLowerCase().includes('moderate')) {
                severity = 'moderate';
            } else if (response.toLowerCase().includes('mild')) {
                severity = 'mild';
            } else {
                severity = 'mild'; // Default to mild if not specified
            }
        }

        return {
            rawResponse: response,
            isAbnormal,
            severity,
            analysis: response
        };
    } catch (error) {
        console.error('Health metric analysis error:', error);
        throw new AppError('Failed to analyze health metric', 500);
    }
};

// AI generate personalized health recommendations
exports.generateHealthRecommendations = async (patientData) => {
    try {
        // Construct prompt for personalized recommendations
        const prompt = `Generate personalized health recommendations for a patient with the following profile:\n\n${JSON.stringify(patientData, null, 2)}\n\nPlease provide specific, actionable recommendations for diet, exercise, lifestyle changes, and wellness activities that would benefit this patient. Consider their medical history, current metrics, and any existing conditions.`;

        const messages = [
            { role: 'user', message: prompt }
        ];

        return await this.generateTextCompletion(messages, { temperature: 0.7 });
    } catch (error) {
        console.error('Health recommendations error:', error);
        throw new AppError('Failed to generate health recommendations', 500);
    }
};