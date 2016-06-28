using UnityEngine;
using System.Collections;
using System.Collections.Generic;

public class JoinButton : MonoBehaviour {

    public delegate void RemoveJoinEventHandler();
    public RemoveJoinEventHandler OnPlayersJoined;

    // Delegates

    [SerializeField]  private JoinCheck _joinCheck;

    bool _playersJoined;

    public bool GetPlayersJoined
    {
        get { return _playersJoined; }
    }


    void Awake()
    {
        _joinCheck.OnPlayerReady += GoToMenu;
    }

    // Add method to the delegate in the JoinCheck script.

    void GoToMenu()
    {
        if (Input.GetKeyDown(KeyCode.Space) || Input.GetButtonDown(ControllerInputs.pressabutton))
        {
            if (OnPlayersJoined != null)
                OnPlayersJoined();

            _playersJoined = true;
        }
            
        /*
         * If the A button has been pressed, fire this delegate.
         */
    }
    
	
}
