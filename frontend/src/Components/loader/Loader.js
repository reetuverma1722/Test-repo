import React from "react";
import { Box } from "@mui/material";

const HexaLoader = () => {
  return (
    <Box
      sx={{
        width: "60px",
        height: "60px",
        backgroundColor: "#4896a1",
        clipPath: "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)",
        animation: "spin 1s linear infinite",
        mx: "auto",
        mt: 5,
        "@keyframes spin": {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" }
        }
      }}
    />
  );
};

export default HexaLoader;
