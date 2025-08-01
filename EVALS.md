This is a system that evaluates different medical decision-making agents on their accuracy.

Given:
a) (model provider, prompt) -- input by the UI by the user
b) list of patient data records (as provided by the Patient Management System)
c) original condition that the patient had (pulled from the Healthie User.diagnosis)

Output:
a) raw model output
b) parsed model output -- should be an array of differentials with the conclusions (positive, negative, needs follow-up)
c) eval score (true or false) of if the given condition is present in the differential list.
