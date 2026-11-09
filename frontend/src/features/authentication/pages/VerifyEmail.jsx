import React, { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
} from "@ant-design/icons";

import { describeError, verifyEmail } from "../services/authService";
import { AuthShell, FormAlert } from "../components/AuthUi";

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const started = useRef(false);

  const [state, setState] = useState(token ? "loading" : "error");
  const [message, setMessage] = useState(
    token ? "" : "This verification link is incomplete."
  );

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;

    verifyEmail(token)
      .then((response) => {
        setMessage(response.message);
        setState("success");
      })
      .catch((error) => {
        setMessage(describeError(error, "Verification failed.").message);
        setState("error");
      });
  }, [token]);

  const icons = {
    loading: <LoadingOutlined />,
    success: <CheckCircleOutlined />,
    error: <CloseCircleOutlined />,
  };

  return (
    <AuthShell
      icon={icons[state]}
      title={
        state === "loading"
          ? "Verifying your email..."
          : state === "success"
          ? "Email verified"
          : "Verification failed"
      }
      subtitle={state === "loading" ? "One moment, please." : undefined}
    >
      <div className="space-y-5 text-center">
        {state !== "loading" && (
          <FormAlert type={state === "success" ? "success" : "error"}>
            {message}
          </FormAlert>
        )}

        {state === "success" && (
          <Link
            to="/login"
            state={{ notice: "Your email is verified. You can sign in now." }}
            className="inline-block w-full bg-[#7A1849] text-white py-3.5 rounded-xl font-bold hover:bg-[#5E1136] text-[14px]"
          >
            Continue to sign in
          </Link>
        )}

        {state === "error" && (
          <p className="text-[13px] text-gray-500">
            Try signing in: if your email is not verified yet you can request
            a new link there.{" "}
            <Link
              to="/login"
              className="font-bold text-[#7A1849] hover:underline"
            >
              Go to sign in
            </Link>
          </p>
        )}
      </div>
    </AuthShell>
  );
}
