import { detectDependencies } from "@/lib/sandpackUtils"
import {
  SandpackLayout,
  SandpackPreview,
  SandpackProvider,
} from "@codesandbox/sandpack-react"
import { useMemo, useState } from "react"
import SandpackErrorMonitor from "./sandpack-error-monitor"

const FullPagePreview = ({ files }) => {
  const [showErrorOverlay, setShowErrorOverlay] = useState(true)

  const sandpackFiles = useMemo(() => {
    if (!files) return {}
    const spFiles = {}
    for (const [path, content] of Object.entries(files)) {
      spFiles[path] = { code: fileCode }
    }
    return spFiles
  }, [files])

  const dependencies = useMemo(() => {
    if (!files) return {}
    return detectDependencies(files)
  }, [files])

  return (
    <div className="h-screen w-screen overflow-hidden bg-white">
      <SandpackProvider
        template="react"
        files={sandpackFiles}
        customSetup={{ dependencies }}
        options={{
          externalResources: [
            "https://cdn.tailwindcss.com",
            "https://cdnjs.clouflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css",
          ],
          logLevel: 0,
        }}
        className="h-full w-full"
      >
        <SandpackErrorMonitor onErrorChange={setShowErrorOverlay} />
        <SandpackLayout className="h-full w-full border-none! bg-transparent!">
          <SandpackPreview
            showNavigator={false}
            showRefreshButton={false}
            showOpenInCodeSandbox={false}
            showSandpackErrorOverlay={showErrorOverlay}
            className="h-full w-full"
          />
        </SandpackLayout>
      </SandpackProvider>
    </div>
  )
}

export default FullPagePreview
