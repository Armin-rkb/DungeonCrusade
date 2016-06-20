using UnityEngine;
using System.Collections;

public class JoinCheck : MonoBehaviour {


    public delegate void OnPlayerEventHandler();
    public OnPlayerEventHandler OnPlayerReady;

    public delegate void OnControllerEventHandler();

    public OnControllerEventHandler OnPlayerOneEnter;
    public OnControllerEventHandler OnPlayerTwoEnter;
    public OnControllerEventHandler OnPlayerThreeEnter;
    public OnControllerEventHandler OnPlayerFourEnter;

   // Delegates

    [SerializeField]  private JoinManager _joinManager;

    bool _p1Joined;
    bool _p2Joined;
    bool _p3Joined;
    bool _p4Joined;

    /*
     * We will need these booleans to determine the amount of players joined.
     * In this case, there's a total of four players.
     */

    void Update()
    {

        if (_joinManager != null)
        {
            AssignPlayerAmount();
            CheckPlayerAmount();
        }

        /*
         * Check per frame if any players have joined.
         */
    }

    void AssignPlayerAmount()
    {
        if (_joinManager.Players < 4)
        {
            CheckP1();
            CheckP2();
            CheckP3();
            CheckP4();
        }

        /*
         * As long as the max amount of players haven't joined yet,
         * Keep on checking these methods.
         */
    }

    void CheckPlayerAmount()
    {
        if (_joinManager.Players >= 2)
        {
            if (OnPlayerReady != null)
                OnPlayerReady();
        }

        /*
         * We need a minimum of two players to play this game.
         * You wouldn't want to play on your own, right?
         * Whenever two or more players have joined, a delegate gets sent.
         * This makes the join button visible.
         */
    }

    void CheckP1()
    {
        if (!_p1Joined)
        {
            if (Input.GetKeyDown(KeyCode.Alpha1) || Input.GetButtonDown(ControllerInputs.p1submit))
            {
                if (OnPlayerOneEnter != null)
                    OnPlayerOneEnter();

                _joinManager.AddPlayer++;
                _p1Joined = true;
            }
        }
    }
    

   void CheckP2()
    {
        if (!_p2Joined)
        {
            if (Input.GetKeyDown(KeyCode.Alpha2) || Input.GetButtonDown(ControllerInputs.p2submit))
            {
                if (OnPlayerTwoEnter != null)
                    OnPlayerTwoEnter();

                _joinManager.AddPlayer++;
                _p2Joined = true;
            }
        }
    }

     void CheckP3()
    {
        if (!_p3Joined)
        {
            if (Input.GetKeyDown(KeyCode.Alpha3) || Input.GetButtonDown(ControllerInputs.p3submit))
            {

                if (OnPlayerThreeEnter != null)
                    OnPlayerThreeEnter();


                _joinManager.AddPlayer++;
                _p3Joined = true;
            }
        }
    }

     void CheckP4()
    {
        if (!_p4Joined)
        {
            if (Input.GetKeyDown(KeyCode.Alpha4) || Input.GetButtonDown(ControllerInputs.p4submit))
            {
                if (OnPlayerFourEnter != null)
                    OnPlayerFourEnter();


                _joinManager.AddPlayer++;
                _p4Joined = true;
            }
        }
    }


    /*
     * These are the methods that makes joining possible.
     * Whenever their join button gets pressed down, a delegate gets sent.
     * The amount of players will get updated, and their joined boolean gets turned on.
     */
}
