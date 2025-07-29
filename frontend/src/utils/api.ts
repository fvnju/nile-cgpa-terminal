type CGPAResponse =
  | {
      success: true;
      data?: {
        code: string;
        name: string;
        grade: string;
        credit: number;
      }[];
    }
  | { success: false; error?: string };

interface CGPARequest {
  studentId: string;
  password: string;
}

export const fetchCGPA = async (
  credentials: CGPARequest
): Promise<CGPAResponse> => {
  try {
    const response = await fetch(`${import.meta.env.VITE_SERVER_URL}/cgpa`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return {
      success: true,
      data,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
};
