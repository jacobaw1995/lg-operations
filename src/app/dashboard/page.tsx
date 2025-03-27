export default function Dashboard() {
    return (
      <div>
        <h1 className="text-3xl font-bold mb-8">Dashboard</h1>
        <div className="grid grid-cols-2 gap-8">
          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className="text-xl font-bold mb-4">Active Projects</h2>
            <p className="text-2xl">3</p>
          </div>
          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className="text-xl font-bold mb-4">Overdue Tasks</h2>
            <p className="text-2xl">1</p>
          </div>
        </div>
      </div>
    );
  }