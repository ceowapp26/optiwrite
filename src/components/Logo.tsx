import Image from "next/image";
import { Poppins } from "next/font/google";
import { cn } from "@/lib/utils";

const font = Poppins({
  subsets: ["latin"],
  weight: ["400", "600"]
});


interface LogoProps {
  height: number;
  width: numner;
}

const AppLogo: React.FC<LogoProps> = ({height, width}) => {
  return (
    <div className="flex cursor-pointer justify-center items-center">
      <Image
        src="/images/Doc2Product-logo.png"
        height={height}
        width={width}
        alt="Logo"
      />
    </div>
  )
}

export default AppLogo;