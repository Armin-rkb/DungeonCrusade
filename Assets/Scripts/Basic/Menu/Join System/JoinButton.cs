using UnityEngine;
using System.Collections;
using System.Collections.Generic;

public class JoinButton : MonoBehaviour {

    public delegate void RemoveJoinEventHandler();
    public RemoveJoinEventHandler OnPlayersJoined;

    // Delegates

    [SerializeField]  private JoinCheck _joinCheck;


    void Awake()
    {
        _joinCheck.OnPlayerReady += GoToMenu;
    }

    // Add method to the delegate in the JoinCheck script.

    void GoToMenu()
    {
        if (Input.GetKeyDown(KeyCode.A) || Input.GetButtonDown(ControllerInputs.pressabutton))
        {
            if (OnPlayersJoined != null)
                OnPlayersJoined();
        }
            
        /*
         * If the A button has been pressed, fire this delegate.
         */
    }
    
	
}
