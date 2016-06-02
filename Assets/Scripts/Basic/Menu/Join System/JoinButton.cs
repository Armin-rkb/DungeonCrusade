using UnityEngine;
using System.Collections;
using System.Collections.Generic;

public class JoinButton : MonoBehaviour {

    public delegate void RemoveJoinEventHandler();

    public RemoveJoinEventHandler OnPlayersJoined;

    [SerializeField]
    private JoinCheck _joinCheck;

    void Awake()
    {
        _joinCheck.OnPlayerReady += GoToMenu;
    }

    void GoToMenu()
    {
        if (Input.GetKeyDown(KeyCode.A) || Input.GetButtonDown(ControllerInputs.pressabutton))
        {
            if (OnPlayersJoined != null)
                OnPlayersJoined();
        }
            
    }
    
	
}
