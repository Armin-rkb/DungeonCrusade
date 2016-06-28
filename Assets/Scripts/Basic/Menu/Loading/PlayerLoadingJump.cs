using UnityEngine;
using System.Collections;

public class PlayerLoadingJump : MonoBehaviour {

    [SerializeField]
    private float _jumpSpeed;

    [SerializeField]
    private Rigidbody2D _thisRigidBody2D;

    void OnCollisionEnter2D(Collision2D coll)
    {
        if (coll.gameObject.CompareTag(GameTags.ground))
        {
            _thisRigidBody2D.velocity = new Vector2(0, _jumpSpeed);
        }
    }
}
