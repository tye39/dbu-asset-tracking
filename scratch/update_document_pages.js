const fs = require('fs');

let html = fs.readFileSync('calibrated_thesis.html', 'utf8');

// Replace Table of Contents with exact verified page numbers
const newToc = `  <table class="toc-table">
    <tr><td><strong>Declaration &amp; Certification</strong></td><td style="text-align: right;">2</td></tr>
    <tr><td><strong>Acknowledgements &amp; Dedication</strong></td><td style="text-align: right;">3</td></tr>
    <tr><td><strong>Abstract</strong></td><td style="text-align: right;">4</td></tr>
    <tr><td><strong>Table of Contents</strong></td><td style="text-align: right;">5</td></tr>
    <tr><td><strong>List of Figures</strong></td><td style="text-align: right;">8</td></tr>
    <tr><td><strong>List of Tables &amp; Abbreviations</strong></td><td style="text-align: right;">9</td></tr>
    <tr><td colspan="2" style="padding-top: 6px;"><strong>CHAPTER ONE: INTRODUCTION</strong></td></tr>
    <tr><td style="padding-left: 15px;">1.1 Background of the Study</td><td style="text-align: right;">10</td></tr>
    <tr><td style="padding-left: 15px;">1.2 Problem Statement</td><td style="text-align: right;">11</td></tr>
    <tr><td style="padding-left: 15px;">1.3 General Objective</td><td style="text-align: right;">12</td></tr>
    <tr><td style="padding-left: 15px;">1.4 Specific Objectives</td><td style="text-align: right;">12</td></tr>
    <tr><td style="padding-left: 15px;">1.5 Significance of the Study</td><td style="text-align: right;">12</td></tr>
    <tr><td style="padding-left: 15px;">1.6 Scope of the System</td><td style="text-align: right;">13</td></tr>
    <tr><td style="padding-left: 15px;">1.7 Limitations of the System</td><td style="text-align: right;">13</td></tr>
    <tr><td style="padding-left: 15px;">1.8 Organization of the Document</td><td style="text-align: right;">13</td></tr>
    <tr><td colspan="2" style="padding-top: 6px;"><strong>CHAPTER TWO: REQUIREMENTS ANALYSIS</strong></td></tr>
    <tr><td style="padding-left: 15px;">2.1 Functional Requirements</td><td style="text-align: right;">14</td></tr>
    <tr><td style="padding-left: 15px;">2.2 Non-Functional Requirements</td><td style="text-align: right;">16</td></tr>
    <tr><td style="padding-left: 15px;">2.3 User Roles and Responsibilities</td><td style="text-align: right;">17</td></tr>
    <tr><td style="padding-left: 15px;">2.4 Use Case Overview &amp; Actor-to-Feature Mapping</td><td style="text-align: right;">18</td></tr>
    <tr><td colspan="2" style="padding-top: 6px;"><strong>CHAPTER THREE: SYSTEM ANALYSIS AND DESIGN</strong></td></tr>
    <tr><td style="padding-left: 15px;">3.1 System Context (Figure 3.1)</td><td style="text-align: right;">19</td></tr>
    <tr><td style="padding-left: 15px;">3.2 System Architecture (Figure 3.2)</td><td style="text-align: right;">20</td></tr>
    <tr><td style="padding-left: 15px;">3.3 Deployment Architecture (Figure 3.3)</td><td style="text-align: right;">21</td></tr>
    <tr><td style="padding-left: 15px;">3.4 Use Case Modeling (Figure 3.4)</td><td style="text-align: right;">22</td></tr>
    <tr><td style="padding-left: 15px;">3.5 Database Design &amp; Relational Schema (Figure 3.5)</td><td style="text-align: right;">23</td></tr>
    <tr><td style="padding-left: 15px;">3.6 Domain Class Diagram (Figure 3.6)</td><td style="text-align: right;">24</td></tr>
    <tr><td style="padding-left: 15px;">3.7 Behavioral Modeling: Activity Diagrams (Figures 3.7 – 3.9)</td><td style="text-align: right;">25</td></tr>
    <tr><td style="padding-left: 15px;">3.8 Dynamic Modeling: Sequence Diagrams (Figures 3.10 – 3.12)</td><td style="text-align: right;">28</td></tr>
    <tr><td colspan="2" style="padding-top: 6px;"><strong>CHAPTER FOUR: SYSTEM IMPLEMENTATION</strong></td></tr>
    <tr><td style="padding-left: 15px;">4.1 Development Environment &amp; Technological Stack</td><td style="text-align: right;">31</td></tr>
    <tr><td style="padding-left: 15px;">4.2 Authentication and Role-Based Authorization Implementation</td><td style="text-align: right;">32</td></tr>
    <tr><td style="padding-left: 15px;">4.3 User, Organizational Unit, and Role Management</td><td style="text-align: right;">32</td></tr>
    <tr><td style="padding-left: 15px;">4.4 Dynamic Asset Registration &amp; Specification Engine</td><td style="text-align: right;">32</td></tr>
    <tr><td style="padding-left: 15px;">4.5 Asset Assignment, Two-Phase Handshake, and Return Workflows</td><td style="text-align: right;">33</td></tr>
    <tr><td style="padding-left: 15px;">4.6 QR Code, Barcode Engineering, and Public Verification</td><td style="text-align: right;">33</td></tr>
    <tr><td style="padding-left: 15px;">4.7 Maintenance Management &amp; Defect Triage</td><td style="text-align: right;">33</td></tr>
    <tr><td style="padding-left: 15px;">4.8 Physical Inventory Sessions &amp; Internal Audit Log Engine</td><td style="text-align: right;">34</td></tr>
    <tr><td style="padding-left: 15px;">4.9 Financial Accounting, Depreciation &amp; Replacement Scoring</td><td style="text-align: right;">34</td></tr>
    <tr><td style="padding-left: 15px;">4.10 Multi-Tiered Asset Requests, Notifications, and Appeals</td><td style="text-align: right;">34</td></tr>
    <tr><td colspan="2" style="padding-top: 6px;"><strong>CHAPTER FIVE: SYSTEM INTERFACES</strong></td></tr>
    <tr><td style="padding-left: 15px;">5.1 Overview of Implemented User Interfaces</td><td style="text-align: right;">35</td></tr>
    <tr><td style="padding-left: 15px;">5.2 Core System Screenshots and Explanations (Figures 5.1 – 5.11)</td><td style="text-align: right;">35</td></tr>
    <tr><td colspan="2" style="padding-top: 6px;"><strong>CHAPTER SIX: TESTING AND RESULTS</strong></td></tr>
    <tr><td style="padding-left: 15px;">6.1 Testing Methodology &amp; Quality Assurance Strategy</td><td style="text-align: right;">40</td></tr>
    <tr><td style="padding-left: 15px;">6.2 Empirical Functional Test Cases (18 Evidence-Based Test Cases)</td><td style="text-align: right;">40</td></tr>
    <tr><td style="padding-left: 15px;">6.3 Security, Privacy &amp; Data Leak Prevention Verification</td><td style="text-align: right;">42</td></tr>
    <tr><td style="padding-left: 15px;">6.4 Comprehensive Verification Results &amp; Pass Rate Summary</td><td style="text-align: right;">43</td></tr>
    <tr><td colspan="2" style="padding-top: 6px;"><strong>CHAPTER SEVEN: DISCUSSION</strong></td></tr>
    <tr><td style="padding-left: 15px;">7.1 Addressing Property Administration Challenges at DBU</td><td style="text-align: right;">44</td></tr>
    <tr><td style="padding-left: 15px;">7.2 Real-Time Custody Governance and Financial Transparency</td><td style="text-align: right;">44</td></tr>
    <tr><td style="padding-left: 15px;">7.3 Physical Verification Efficiency &amp; QR Tag Security</td><td style="text-align: right;">44</td></tr>
    <tr><td style="padding-left: 15px;">7.4 Architectural Trade-Offs and Lessons Learned</td><td style="text-align: right;">44</td></tr>
    <tr><td colspan="2" style="padding-top: 6px;"><strong>CHAPTER EIGHT: CONCLUSION AND RECOMMENDATIONS</strong></td></tr>
    <tr><td style="padding-left: 15px;">8.1 Conclusion</td><td style="text-align: right;">45</td></tr>
    <tr><td style="padding-left: 15px;">8.2 Recommendations and Future Work</td><td style="text-align: right;">45</td></tr>
    <tr><td colspan="2" style="padding-top: 6px;"><strong>REFERENCES &amp; APPENDICES</strong></td></tr>
    <tr><td style="padding-left: 15px;">References (Academic Standard)</td><td style="text-align: right;">46</td></tr>
    <tr><td style="padding-left: 15px;">Appendix A: Selected Database Schema &amp; Enumeration Listings</td><td style="text-align: right;">47</td></tr>
    <tr><td style="padding-left: 15px;">Appendix B: Code 39 Barcode Pattern Table &amp; Math Derivations</td><td style="text-align: right;">49</td></tr>
  </table>`;

html = html.replace(/<table class="toc-table">[\s\S]*?<\/table>/, newToc);

// Replace List of Figures with exact verified page numbers
const newLof = `  <table class="toc-table">
    <tr><td><strong>Figure 3.1:</strong> System Context Diagram of the DBU Asset Tracking System</td><td style="text-align: right;">19</td></tr>
    <tr><td><strong>Figure 3.2:</strong> System Architecture Diagram – Layered Component Structure</td><td style="text-align: right;">20</td></tr>
    <tr><td><strong>Figure 3.3:</strong> Deployment Architecture Diagram – Physical Node Topology</td><td style="text-align: right;">21</td></tr>
    <tr><td><strong>Figure 3.4:</strong> UML Use Case Diagram – Comprehensive Subsystem Actor Interactions</td><td style="text-align: right;">22</td></tr>
    <tr><td><strong>Figure 3.5:</strong> Entity-Relationship Diagram of the DBU Asset Tracking Database</td><td style="text-align: right;">23</td></tr>
    <tr><td><strong>Figure 3.6:</strong> Domain Class Diagram – Entities, Operations, and Multiplicities</td><td style="text-align: right;">24</td></tr>
    <tr><td><strong>Figure 3.7:</strong> Activity Diagram – Dynamic Asset Registration Workflow</td><td style="text-align: right;">25</td></tr>
    <tr><td><strong>Figure 3.8:</strong> Activity Diagram – Two-Phase Custody Handshake Workflow</td><td style="text-align: right;">26</td></tr>
    <tr><td><strong>Figure 3.9:</strong> Activity Diagram – Maintenance &amp; Repair Lifecycle Workflow</td><td style="text-align: right;">27</td></tr>
    <tr><td><strong>Figure 3.10:</strong> Sequence Diagram – User Authentication and JWT Role Redirection</td><td style="text-align: right;">28</td></tr>
    <tr><td><strong>Figure 3.11:</strong> Sequence Diagram – Custody Assignment &amp; Acceptance Handshake</td><td style="text-align: right;">29</td></tr>
    <tr><td><strong>Figure 3.12:</strong> Sequence Diagram – Privacy-Preserving Public QR Verification</td><td style="text-align: right;">30</td></tr>
    <tr><td><strong>Figure 5.1:</strong> System Authentication and Login Interface</td><td style="text-align: right;">35</td></tr>
    <tr><td><strong>Figure 5.2:</strong> System Administrator Executive Financial &amp; KPI Dashboard</td><td style="text-align: right;">35</td></tr>
    <tr><td><strong>Figure 5.3:</strong> Property Administration Officer Operational Overview Interface</td><td style="text-align: right;">36</td></tr>
    <tr><td><strong>Figure 5.4:</strong> Dynamic Asset Registration and Technical Specification Form</td><td style="text-align: right;">36</td></tr>
    <tr><td><strong>Figure 5.5:</strong> Comprehensive Asset Detail View with QR Code and Barcode Tag</td><td style="text-align: right;">37</td></tr>
    <tr><td><strong>Figure 5.6:</strong> Department Head Asset Oversight &amp; Staff Requests Panel</td><td style="text-align: right;">37</td></tr>
    <tr><td><strong>Figure 5.7:</strong> Staff Member Custody &amp; Pending Acceptance Interface</td><td style="text-align: right;">38</td></tr>
    <tr><td><strong>Figure 5.8:</strong> Maintenance Technician Service Ticket Tracking Interface</td><td style="text-align: right;">38</td></tr>
    <tr><td><strong>Figure 5.9:</strong> Physical Inventory Verification Session Interface</td><td style="text-align: right;">39</td></tr>
    <tr><td><strong>Figure 5.10:</strong> Internal Auditor Transaction Audit Log Interface</td><td style="text-align: right;">39</td></tr>
    <tr><td><strong>Figure 5.11:</strong> Privacy-Safe Public QR Code Verification View</td><td style="text-align: right;">39</td></tr>
  </table>`;

// Find second toc-table (List of Figures)
const lofRegex = /(<h1 class="chapter-title">List of Figures<\/h1>\s*)<table class="toc-table">[\s\S]*?<\/table>/;
html = html.replace(lofRegex, `$1${newLof}`);

// Replace List of Tables with exact verified page numbers
const newLot = `  <table class="toc-table">
    <tr><td><strong>Table 2.1:</strong> Functional Requirements Specification Matrix</td><td style="text-align: right;">15</td></tr>
    <tr><td><strong>Table 2.2:</strong> Non-Functional Requirements Specification Matrix</td><td style="text-align: right;">16</td></tr>
    <tr><td><strong>Table 2.3:</strong> Comprehensive System Roles and Institutional Responsibilities</td><td style="text-align: right;">17</td></tr>
    <tr><td><strong>Table 2.4:</strong> High-Level Use Case to Actor Mapping Matrix</td><td style="text-align: right;">18</td></tr>
    <tr><td><strong>Table 4.1:</strong> Software Stack and Production Environment Inventory</td><td style="text-align: right;">31</td></tr>
    <tr><td><strong>Table 6.1:</strong> Empirical Functional and Transactional Verification Test Matrix</td><td style="text-align: right;">41</td></tr>
    <tr><td><strong>Table 6.2:</strong> Privacy and Public QR Data Leakage Verification Results</td><td style="text-align: right;">42</td></tr>
  </table>`;

const lotRegex = /(<h1 class="chapter-title">List of Tables &amp; Abbreviations<\/h1>\s*)<table class="toc-table">[\s\S]*?<\/table>/;
html = html.replace(lotRegex, `$1${newLot}`);

// Write both thesis_document.html and calibrated_thesis.html
fs.writeFileSync('thesis_document.html', html, 'utf8');
fs.writeFileSync('calibrated_thesis.html', html, 'utf8');
console.log('Successfully updated thesis_document.html and calibrated_thesis.html with verified page numbers!');
