using UnityEngine;
using System.Collections;

public class PlayerFootStool : MonoBehaviour {

    public delegate void FootStoolEventHandler();

    public FootStoolEventHandler OnFootStool;

    [SerializeField]
    private PlayerMovement _playerMovement;
    [SerializeField]
    private PlayerFlip _playerFlip;

	void OnTriggerEnter2D(Collider2D player)
    {
        if (player.gameObject.CompareTag(GameTags.footstool))
        {

            if (OnFootStool != null)
                OnFootStool();

            if (_playerFlip.facingRight)
            {
                this.GetComponent<Rigidbody2D>().velocity = new Vector2(0, 5);
            //    this.GetComponent<Rigidbody2D>().AddForce(new Vector2(1500, 0));
            }
                
            else
            {
                this.GetComponent<Rigidbody2D>().velocity = new Vector2(0, 5);
               // this.GetComponent<Rigidbody2D>().AddForce(new Vector2(-1500, 0));
            }
                
        }
    }
}
