This is the triage tester system.

# System Data Flow

Conditions are sent to a patient generator. The patient generator creates some demographic of patient (age, sex, weight, pre-existing conditions, ...) that fits that condition (e.g. ectopic pregnancy would be female, Huntington's disease would be younger than 70, ...). Given a patient, that would be sent to a "Presentation Generation" system that would figure out how that specific condition would present as, along with any other possible co-occuring conditions. This patient and condition(s) presentation would then be used to answer questions given by the triage system.

The triage system takes a Q&A of a medical intake and generates a list of differentials for the convo. The differential list should include both the most likely conditions but also the riskiest conditions that should be ruled out or have been ruled out should be in the differential.

Then, the inputs and outptus of the system are sent to a bsic eval system that has a list of patient profiles and "X is presenting with ..." presentation breifs -- paired with the ddx output of the triage system.

# System Descriptions

## Patient Generator

Given a condition and other set of patient constraints, generate a random patient that logically might have that condition. Should output probabililty distributions on the different patient attributes.

## Presentation Generation

Given a sample patient described by their demographic and H&P and CC, generate a comprehensive set of sx/exam findings that could be found. There should be a distribution of sx described, which then gets sent to a random dicerolling system to select the exact set of sx presenting.

## Triage System (given through API)

Q&A in, ddx out. Black box to evaluate.

## Differential Evaluation

Dead simple, kind of like NER metrics but just checking that the ddx list contains all the required dx as specified in the eval set. Extra dx are penalized, but captured in a separate metric.


# Data Provided

conditions.txt contains the list of covered conditions that we want to test against.
intake.txt contains a list of sample dimensions for patient generation.
