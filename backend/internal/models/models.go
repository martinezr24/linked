package models

type MessageEnvelope struct {
	Action  string `json:"action"`
	Payload any    `json:"payload"`
}

type ListItem struct {
	ID       string  `json:"id"`
	Text     string  `json:"text"`
	Note     *string `json:"note,omitempty"`
	ListType string  `json:"listType"`
	EventID  *string `json:"eventId,omitempty"`
}

type CheckIn struct {
	ID        string  `json:"id"`
	UserID    string  `json:"userId"`
	CheckDate string  `json:"checkDate"`
	Note      *string `json:"note,omitempty"`
	IsMine    bool    `json:"isMine"`
}

type TodayCheckIns struct {
	Mine    *CheckIn `json:"mine"`
	Partner *CheckIn `json:"partner"`
}

type WeeklyGoal struct {
	ID        string `json:"id"`
	GoalText  string `json:"goalText"`
	WeekStart string `json:"weekStart"`
	Done      bool   `json:"done"`
}

type SharedEvent struct {
	ID         string  `json:"id"`
	Title      string  `json:"title"`
	EventAt    string  `json:"eventAt"`
	OwnerLabel *string `json:"ownerLabel,omitempty"`
}

type User struct {
	ID             string
	DeviceID       string
	RelationshipID *string
	DisplayName    *string
}

type ConnectionStreak struct {
	CurrentStreak int  `json:"currentStreak"`
	LongestStreak int  `json:"longestStreak"`
	BothCheckedIn bool `json:"bothCheckedInToday"`
}

type AsyncNote struct {
	ID          string  `json:"id"`
	TriggerType string  `json:"triggerType"`
	TriggerValue *string `json:"triggerValue,omitempty"`
	Body        string  `json:"body"`
	IsMine      bool    `json:"isMine"`
	OpenedAt    *string `json:"openedAt,omitempty"`
	CreatedAt   string  `json:"createdAt"`
}

type WidgetSummary struct {
	NextVisitAt      *string `json:"nextVisitAt"`
	NextEventTitle   *string `json:"nextEventTitle"`
	NextEventAt      *string `json:"nextEventAt"`
	PartnerCheckedIn bool    `json:"partnerCheckedIn"`
	MineCheckedIn    bool    `json:"mineCheckedIn"`
	CurrentStreak    int     `json:"currentStreak"`
}
