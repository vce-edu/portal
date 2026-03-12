import React, { useState, useEffect } from "react";
import { supabase } from "../createClient";
import { Card, CardHeader, StatsCard } from "../components/ui/Card";
import { Table, THead, TBody, TH, TD, TR } from "../components/ui/Table";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import { Input } from "../components/ui/Input";

export default function Performance() {
  const [studentSummary, setStudentSummary] = useState([]);
  const [examSummary, setExamSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedExam, setSelectedExam] = useState(null);
  const [examDetails, setExamDetails] = useState([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchSummaries();
  }, []);

  const fetchSummaries = async () => {
    setLoading(true);
    try {
      const { data: studentData, error: studentError } = await supabase.rpc("get_student_performance_summary");
      const { data: examData, error: examError } = await supabase.rpc("get_exam_summary");

      if (studentError) throw studentError;
      if (examError) throw examError;

      setStudentSummary(studentData || []);
      setExamSummary(examData || []);
    } catch (error) {
      console.error("Error fetching summaries:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchExamDetails = async (examId) => {
    setDetailsLoading(true);
    setSelectedExam(examId);
    setSearchQuery(""); // Clear search when switching exams
    try {
      const { data, error } = await supabase
        .from("exam_result")
        .select("*")
        .eq("exam_id", examId)
        .order("score", { ascending: false });

      if (error) throw error;
      setExamDetails(data || []);
    } catch (error) {
      console.error("Error fetching exam details:", error);
    } finally {
      setDetailsLoading(false);
    }
  };

  const filteredDetails = examDetails.filter((item) =>
    item.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.roll_number.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // New ranking logic: Only consider students with at least 2 exams to eliminate single-exam bias
  const topPerformers = studentSummary
    .filter((s) => s.total_exams >= 2)
    .slice(0, 5);

  const needsAttention = studentSummary
    .filter((s) => parseFloat(s.average_percentage) < 40)
    .sort((a, b) => a.average_percentage - b.average_percentage)
    .slice(0, 5);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (selectedExam) {
    const activeExamData = examSummary.find(e => e.exam_id === selectedExam);
    return (
      <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <Button variant="outline" onClick={() => setSelectedExam(null)} className="mb-4">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Overview
            </Button>
            <h1 className="text-3xl font-black text-gray-900">{selectedExam} Module</h1>
          </div>
          <div className="w-full sm:w-72">
            <Input
              placeholder="Search student or roll..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={() => (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              )}
            />
          </div>
        </div>

        {/* Exam Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatsCard
            title="Average Points"
            value={activeExamData ? parseFloat(activeExamData.average_score).toFixed(1) : "0"}
            variant="purple"
            icon={(props) => (
              <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            )}
          />
          <StatsCard
            title="Module ID"
            value={selectedExam}
            variant="blue"
            icon={(props) => (
              <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 11h.01M7 15h.01M13 7h.01M13 11h.01M13 15h.01M17 7h.01M17 11h.01M17 15h.01" />
              </svg>
            )}
          />
          <StatsCard
            title="Students Appeared"
            value={activeExamData ? activeExamData.total_students : "0"}
            variant="green"
            icon={(props) => (
              <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            )}
          />
        </div>

        <Card noPadding>
          <Table>
            <THead>
              <TR>
                <TH>Roll Number</TH>
                <TH>Student Name</TH>
                <TH>Score</TH>
                <TH>Percentage</TH>
                <TH>Status</TH>
              </TR>
            </THead>
            <TBody>
              {detailsLoading ? (
                <TR>
                  <TD colSpan={5} className="text-center py-10">
                    <div className="animate-pulse text-gray-500 font-medium">Loading results...</div>
                  </TD>
                </TR>
              ) : filteredDetails.length === 0 ? (
                <TR>
                  <TD colSpan={5} className="text-center py-10 text-gray-400 italic">
                    No results found for this search.
                  </TD>
                </TR>
              ) : (
                filteredDetails.map((result) => (
                  <TR key={result.roll_number}>
                    <TD className="font-bold">{result.roll_number}</TD>
                    <TD className="font-medium">{result.student_name}</TD>
                    <TD>
                      <span className="text-gray-900 font-bold">{result.score}</span>
                      <span className="text-gray-400 text-sm"> / {result.out_of}</span>
                    </TD>
                    <TD>
                      <Badge variant={(result.score / result.out_of) >= 0.4 ? "green" : "red"}>
                        {((result.score / result.out_of) * 100).toFixed(1)}%
                      </Badge>
                    </TD>
                    <TD>
                      {(result.score / result.out_of) >= 0.8 ? (
                        <span className="text-green-600 font-bold text-sm uppercase">Excellent</span>
                      ) : (result.score / result.out_of) >= 0.4 ? (
                        <span className="text-blue-600 font-bold text-sm uppercase">Passed</span>
                      ) : (
                        <span className="text-red-600 font-bold text-sm uppercase">Critical</span>
                      )}
                    </TD>
                  </TR>
                ))
              )}
            </TBody>
          </Table>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-10">
      <div>
        <h1 className="text-3xl sm:text-5xl font-black text-gray-900 tracking-tight">Student Analytics</h1>
        <p className="text-gray-500 mt-2 font-medium">Data-driven insights into academic performance</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Top Performers Card */}
        <Card className="border-purple-100 bg-gradient-to-br from-white to-purple-50/30">
          <CardHeader
            title="Top Performing Students"
            subtitle="Consistency Leaders (Min. 2 Exams)"
            action={
              <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
            }
          />
          <div className="space-y-4">
            {topPerformers.length > 0 ? (
              topPerformers.map((student, index) => (
                <div key={student.roll_number} className="flex items-center justify-between p-3 bg-white rounded-2xl shadow-sm border border-purple-50 group hover:border-purple-200 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{student.student_name}</p>
                      <p className="text-xs text-gray-500 uppercase font-medium">{student.roll_number}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-purple-600">{parseFloat(student.average_percentage).toFixed(1)}%</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{student.total_exams} Exams</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-gray-400 italic text-sm">
                No students meet the consistency threshold yet.
              </div>
            )}
          </div>
        </Card>

        {/* Needs Attention Card */}
        <Card className="border-red-100 bg-gradient-to-br from-white to-red-50/30">
          <CardHeader
            title="Serious Attention Required"
            subtitle="Students falling below 40% threshold"
            action={
              <div className="p-2 bg-red-100 rounded-lg text-red-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            }
          />
          <div className="space-y-4">
            {needsAttention.length > 0 ? (
              needsAttention.map((student) => (
                <div key={student.roll_number} className="flex items-center justify-between p-3 bg-white rounded-2xl shadow-sm border border-red-50 group hover:border-red-200 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold text-sm">
                      !
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{student.student_name}</p>
                      <p className="text-xs text-gray-500 uppercase font-medium">{student.roll_number}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-red-600">{parseFloat(student.average_percentage).toFixed(1)}%</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{student.total_exams} Exams</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-12 text-center">
                <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-sm font-bold text-gray-500 uppercase">All students are above threshold</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      <div className="space-y-6">
        <h2 className="text-2xl font-black text-gray-900">Exam Modules</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {examSummary.map((exam) => (
            <div
              key={exam.exam_id}
              onClick={() => fetchExamDetails(exam.exam_id)}
              className="group cursor-pointer bg-white p-6 rounded-3xl shadow-lg border border-gray-100 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-purple-600/5 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-500"></div>

              <div className="relative">
                <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 group-hover:bg-purple-600 group-hover:text-white transition-colors mb-4">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>

                <h3 className="text-xl font-bold text-gray-900 mb-1 group-hover:text-purple-600 transition-colors uppercase tracking-tight">
                  {exam.exam_id}
                </h3>

                <div className="flex items-center gap-2 mb-4">
                  <Badge variant="blue" className="text-[10px] uppercase font-bold">
                    {exam.total_students} Students
                  </Badge>
                  <Badge variant="purple" className="text-[10px] uppercase font-bold">
                    Out of {exam.max_out_of}
                  </Badge>
                </div>

                <div className="pt-4 border-t border-gray-50 flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Avg Score</span>
                  <span className="text-lg font-black text-gray-900">{parseFloat(exam.average_score).toFixed(1)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
